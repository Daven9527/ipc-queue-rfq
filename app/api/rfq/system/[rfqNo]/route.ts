import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const HASH_KEY = (rfqNo: string) => `rfq:system:${rfqNo}`;
const HISTORY_KEY = (rfqNo: string) => `rfq:system:history:${rfqNo}`;

export async function GET(_req: Request, { params }: { params: Promise<{ rfqNo: string }> }) {
  const { rfqNo } = await params;
  const data = await redis.hgetall<Record<string, string>>(HASH_KEY(rfqNo));
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ rfqNo: string }> }) {
  const { rfqNo } = await params;
  const updates = await request.json();
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const key = HASH_KEY(rfqNo);
  const exists = await redis.exists(key);
  if (!exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const current = await redis.hgetall<Record<string, string>>(key);
  const next: Record<string, string> = {
    ...current,
  };

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null) continue;
    if (k === "createdAt") continue;
    next[k] = String(v);
  }
  next.updatedAt = new Date().toISOString();

  await redis.hset(key, next);

  // history
  try {
    await redis.lpush(HISTORY_KEY(rfqNo), JSON.stringify({ ts: next.updatedAt, updates }));
  } catch (e) {
    console.error("history push failed", e);
  }

  return NextResponse.json({ ok: true });
}

