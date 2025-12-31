import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { authenticateBasic, requireRole } from "@/lib/auth";
import { addLog } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireRole(request, "super");
  if (authError) return authError;

  // 僅允許 superadmin 執行重置
  const user = await authenticateBasic(request);
  if (!user || user.username !== "superadmin") {
    return NextResponse.json({ error: "僅 superadmin 可重置" }, { status: 403 });
  }

  try {
    // Get all ticket numbers before clearing
    const ticketNumbers = await redis.lrange<number[]>("queue:tickets", 0, -1);
    
    // Delete all ticket info hashes
    if (ticketNumbers && ticketNumbers.length > 0) {
      const keys = ticketNumbers.map((num) => `queue:ticket:${num}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }

    await redis.mset({
      "queue:current": 0,
      "queue:last": 0,
      "queue:next": 1,
    });
    // Clear the tickets list
    await redis.del("queue:tickets");

    // 重置 RFQ 列表
    const systemIds = await redis.smembers<string[]>("rfq:system:ids");
    const mbIds = await redis.smembers<string[]>("rfq:mb:ids");
    
    // 刪除所有 System RFQ
    if (systemIds && systemIds.length > 0) {
      const systemKeys = systemIds.flatMap((rfqNo) => [
        `rfq:system:${rfqNo}`,
        `rfq:system:history:${rfqNo}`,
      ]);
      if (systemKeys.length > 0) {
        await redis.del(...systemKeys);
      }
      await redis.del("rfq:system:ids");
    }
    
    // 刪除所有 MB RFQ
    if (mbIds && mbIds.length > 0) {
      const mbKeys = mbIds.flatMap((rfqNo) => [
        `rfq:mb:${rfqNo}`,
        `rfq:mb:history:${rfqNo}`,
      ]);
      if (mbKeys.length > 0) {
        await redis.del(...mbKeys);
      }
      await redis.del("rfq:mb:ids");
    }

    await addLog({
      ts: new Date().toISOString(),
      username: user.username,
      role: user.role,
      action: "reset",
      detail: "system reset",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "重置失敗" },
      { status: 500 }
    );
  }
}
