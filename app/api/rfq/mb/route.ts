import { NextResponse, NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const INDEX_KEY = "rfq:mb:ids";
const HASH_KEY = (rfqNo: string) => `rfq:mb:${rfqNo}`;

// 生成下一個 MB RFQ ID (格式: RFQ(M)-000, RFQ(M)-001, ...)
async function generateNextRfqNo(): Promise<string> {
  const ids = await redis.smembers<string[]>(INDEX_KEY);
  if (!ids || ids.length === 0) {
    return "RFQ(M)-000";
  }
  
  // 找出最大的編號
  let maxNum = -1;
  for (const id of ids) {
    const match = id.match(/^RFQ\(M\)-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  return `RFQ(M)-${nextNum.toString().padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const ids = await redis.smembers<string[]>(INDEX_KEY);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ ids: [] });
  }

  if (!status) {
    return NextResponse.json({ ids });
  }

  const filtered: string[] = [];
  for (const id of ids) {
    const ws = await redis.hget(HASH_KEY(id), "workflowStatus");
    if ((ws || "new") === status) filtered.push(id);
  }
  return NextResponse.json({ ids: filtered });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let rfqNo = (body?.rfqNo || "").toString().trim();
    
    // 如果沒有提供 rfqNo，自動生成
    if (!rfqNo) {
      rfqNo = await generateNextRfqNo();
    }
    
    const hashKey = HASH_KEY(rfqNo);
    const exists = await redis.exists(hashKey);
    if (exists) {
      return NextResponse.json({ error: "已存在" }, { status: 409 });
    }
    const now = new Date().toISOString();
    await redis.sadd(INDEX_KEY, rfqNo);
    await redis.hset(hashKey, {
      rfqNo,
      workflowStatus: "new",
      assignee: "",
      createdAt: now,
      updatedAt: now,
      source: "manual",
    });
    return NextResponse.json({ ok: true, rfqNo });
  } catch (error) {
    console.error("create rfq mb failed", error);
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}

