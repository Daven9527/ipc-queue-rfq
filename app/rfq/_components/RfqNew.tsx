"use client";

import { useState } from "react";
import type { RfqArea } from "./types";

const areaLabel: Record<RfqArea, string> = {
  system: "System RFQ",
  mb: "MB RFQ",
};

async function createRfq(area: RfqArea, rfqNo?: string) {
  const res = await fetch(`/api/rfq/${area}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rfqNo ? { rfqNo } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "建立失敗");
  }
  const data = await res.json();
  return data.rfqNo as string;
}

export default function RfqNew({ area }: { area: RfqArea }) {
  const [rfqNo, setRfqNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const createdRfqNo = await createRfq(area, rfqNo.trim() || undefined);
      setMsg(`建立成功！RFQ No: ${createdRfqNo}`);
      setRfqNo("");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
        >
          ← 返回主頁
        </a>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{areaLabel[area]} 新增</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RFQ No <span className="text-gray-500 text-xs">(留空將自動生成)</span>
          </label>
          <input
            value={rfqNo}
            onChange={(e) => setRfqNo(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="留空將自動生成，或手動輸入"
          />
        </div>
        {msg && <div className="text-sm text-gray-700">{msg}</div>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "建立中..." : "建立"}
        </button>
      </form>
    </div>
  );
}

