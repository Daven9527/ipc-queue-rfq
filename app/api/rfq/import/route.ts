import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { redis } from "@/lib/redis";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Area = "system" | "mb";

const AREA_CONFIG: Record<string, Area> = {
  "System RFQ": "system",
  "MB RFQ": "mb",
};

const INDEX_KEY = (area: Area) => `rfq:${area}:ids`;
const HASH_KEY = (area: Area, rfqNo: string) => `rfq:${area}:${rfqNo}`;
const nowIso = () => new Date().toISOString();

function normalizeRecord(row: unknown[], headers: string[]) {
  const rec: Record<string, string> = {};
  headers.forEach((h, idx) => {
    const key = (h ?? "").toString().trim();
    if (!key) return;
    const val = row[idx];
    rec[key] = val === undefined || val === null ? "" : String(val);
  });
  return rec;
}

export async function POST(request: Request) {
  const authError = await requireRole(request, "super");
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "缺少檔案" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const stats = {
      system: { created: 0, updated: 0, skipped: 0 },
      mb: { created: 0, updated: 0, skipped: 0 },
    };

    for (const sheetName of workbook.SheetNames) {
      const area = AREA_CONFIG[sheetName];
      if (!area) continue; // 忽略 Flow 或其他 sheet

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      if (!rows || rows.length < 3) continue; // 至少需要：格式化標題行、標題行、一筆資料

      // 第一行是格式化標題，跳過；第二行（index 1）是真正的 headers
      const headers = rows[1].map((h) => (h ?? "").toString().trim());
      const rfqNoIdx = headers.findIndex((h) => h === "RFQ No.");
      if (rfqNoIdx === -1) continue;

      // 找出狀態欄位（可能是第一列或包含 "Status" 的欄位）
      let statusIdx = -1;
      const statusHeaders = ["RFQ Status", "Status", "RFQ Sta", "PM Status Update", "RFQ Status\r\n(下拉選單)"];
      for (const sh of statusHeaders) {
        statusIdx = headers.findIndex((h) => h.includes(sh) || sh.includes(h));
        if (statusIdx !== -1) break;
      }
      // 如果找不到，嘗試第一列（index 0）
      if (statusIdx === -1) {
        statusIdx = 0;
      }

      // 從第三行（index 2）開始讀取資料
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rfqNoRaw = row[rfqNoIdx];
        if (rfqNoRaw === undefined || rfqNoRaw === null || rfqNoRaw === "") {
          stats[area].skipped++;
          continue;
        }
        const rfqNo = String(rfqNoRaw).trim();
        if (!rfqNo) {
          stats[area].skipped++;
          continue;
        }

        // 從第一行資料抓取狀態（如果存在且有效）
        const statusFromExcel = statusIdx >= 0 && row[statusIdx] 
          ? String(row[statusIdx]).trim() 
          : "";
        
        const rec = normalizeRecord(row, headers);
        const hashKey = HASH_KEY(area, rfqNo);
        const exists = await redis.exists(hashKey);
        const now = nowIso();

        const current = exists ? await redis.hgetall<Record<string, string>>(hashKey) : {};
        const createdAt = current?.createdAt || now;
        
        // 優先使用 Excel 中的狀態，如果沒有則保留現有狀態，最後才用預設值
        const workflowStatus = statusFromExcel || current?.workflowStatus || "new";

        await redis.sadd(INDEX_KEY(area), rfqNo);
        await redis.hset(hashKey, {
          ...current,
          ...rec,
          rfqNo,
          workflowStatus,
          assignee: current?.assignee ?? "",
          createdAt,
          updatedAt: now,
          source: "excel",
        });

        if (exists) {
          stats[area].updated++;
        } else {
          stats[area].created++;
        }
      }
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("RFQ import failed", error);
    return NextResponse.json({ error: "匯入失敗" }, { status: 500 });
  }
}

