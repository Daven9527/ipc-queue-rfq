import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const INDEX_KEY_SYSTEM = "rfq:system:ids";
const INDEX_KEY_MB = "rfq:mb:ids";
const HASH_KEY_SYSTEM = (rfqNo: string) => `rfq:system:${rfqNo}`;
const HASH_KEY_MB = (rfqNo: string) => `rfq:mb:${rfqNo}`;

async function fetchAllRfqs(area: "system" | "mb"): Promise<Array<Record<string, string>>> {
  const indexKey = area === "system" ? INDEX_KEY_SYSTEM : INDEX_KEY_MB;
  const hashKey = area === "system" ? HASH_KEY_SYSTEM : HASH_KEY_MB;
  
  const ids = await redis.smembers<string[]>(indexKey);
  if (!ids || ids.length === 0) {
    return [];
  }

  const rfqs = await Promise.all(
    ids.map(async (rfqNo) => {
      const data = await redis.hgetall<Record<string, string>>(hashKey(rfqNo));
      return { rfqNo, ...data } as Record<string, string>;
    })
  );

  return rfqs;
}

export async function GET() {
  try {
    // 獲取所有 System 和 MB RFQ 資料
    const [systemRfqs, mbRfqs] = await Promise.all([
      fetchAllRfqs("system"),
      fetchAllRfqs("mb"),
    ]);

    if (systemRfqs.length === 0 && mbRfqs.length === 0) {
      return NextResponse.json(
        { error: "沒有 RFQ 資料可以匯出" },
        { status: 404 }
      );
    }

    // 創建 Excel 工作簿
    const workbook = XLSX.utils.book_new();

    // 處理 System RFQ 資料
    if (systemRfqs.length > 0) {
      // 將所有欄位轉換為陣列格式，保持欄位順序
      const systemData = systemRfqs.map((rfq) => {
        const row: Record<string, any> = {};
        // 確保重要欄位在前面
        row["RFQ No."] = rfq["rfqNo"] || "";
        row["workflowStatus"] = rfq["workflowStatus"] || "";
        row["assignee"] = rfq["assignee"] || "";
        row["Assigned PM"] = rfq["Assigned PM"] || rfq["assignee"] || "";
        row["Customer"] = rfq["Customer"] || rfq["customer"] || "";
        row["Sales"] = rfq["Sales"] || rfq["sales"] || "";
        row["createdAt"] = rfq["createdAt"] || "";
        row["updatedAt"] = rfq["updatedAt"] || "";
        row["salesReply"] = rfq["salesReply"] || "";
        row["salesReplyDate"] = rfq["salesReplyDate"] || "";
        row["pmReply"] = rfq["pmReply"] || "";
        row["pmReplyDate"] = rfq["pmReplyDate"] || "";
        row["source"] = rfq["source"] || "";

        // 添加其他所有欄位
        Object.keys(rfq).forEach((key) => {
          if (!row.hasOwnProperty(key) && key !== "rfqNo") {
            row[key] = rfq[key] || "";
          }
        });

        return row;
      });

      const systemWorksheet = XLSX.utils.json_to_sheet(systemData);
      XLSX.utils.book_append_sheet(workbook, systemWorksheet, "System RFQ");
    }

    // 處理 MB RFQ 資料
    if (mbRfqs.length > 0) {
      const mbData = mbRfqs.map((rfq) => {
        const row: Record<string, any> = {};
        row["RFQ No."] = rfq["rfqNo"] || "";
        row["workflowStatus"] = rfq["workflowStatus"] || "";
        row["assignee"] = rfq["assignee"] || "";
        row["Assigned PM"] = rfq["Assigned PM"] || rfq["assignee"] || "";
        row["Customer"] = rfq["Customer"] || rfq["customer"] || "";
        row["Sales"] = rfq["Sales"] || rfq["sales"] || "";
        row["createdAt"] = rfq["createdAt"] || "";
        row["updatedAt"] = rfq["updatedAt"] || "";
        row["salesReply"] = rfq["salesReply"] || "";
        row["salesReplyDate"] = rfq["salesReplyDate"] || "";
        row["pmReply"] = rfq["pmReply"] || "";
        row["pmReplyDate"] = rfq["pmReplyDate"] || "";
        row["source"] = rfq["source"] || "";

        Object.keys(rfq).forEach((key) => {
          if (!row.hasOwnProperty(key) && key !== "rfqNo") {
            row[key] = rfq[key] || "";
          }
        });

        return row;
      });

      const mbWorksheet = XLSX.utils.json_to_sheet(mbData);
      XLSX.utils.book_append_sheet(workbook, mbWorksheet, "MB RFQ");
    }

    // 生成 Excel 文件緩衝區
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // 生成文件名（包含當前日期時間）
    const now = new Date();
    const fileNameUtf8 = `RFQ資料_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.xlsx`;
    const fileNameAscii = `rfq_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.xlsx`;

    // 返回 Excel 文件
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${encodeURIComponent(fileNameUtf8)}`,
      },
    });
  } catch (error) {
    console.error("Error exporting RFQ to Excel:", error);
    return NextResponse.json(
      { error: "匯出失敗" },
      { status: 500 }
    );
  }
}
