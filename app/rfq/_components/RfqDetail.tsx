"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RfqArea, RfqRecord } from "./types";

const defaultStatuses = ["new", "processing", "done"];

async function fetchDetail(area: RfqArea, rfqNo: string): Promise<RfqRecord | null> {
  const res = await fetch(`/api/rfq/${area}/${encodeURIComponent(rfqNo)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return { rfqNo, ...data };
}

async function patchDetail(area: RfqArea, rfqNo: string, updates: Record<string, string>) {
  const res = await fetch(`/api/rfq/${area}/${encodeURIComponent(rfqNo)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "更新失敗");
  }
}

export default function RfqDetail({ area, rfqNo }: { area: RfqArea; rfqNo: string }) {
  const [data, setData] = useState<RfqRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [salesReply, setSalesReply] = useState("");
  const [pmReply, setPmReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await fetchDetail(area, rfqNo);
        if (!detail) {
          setError("找不到資料");
          return;
        }
        setData(detail);
        setWorkflowStatus(detail.workflowStatus || "new");
        setAssignee(detail.assignee || "");
        setSalesReply(detail.salesReply || "");
        setPmReply(detail.pmReply || "");
      } catch {
        setError("載入失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, [area, rfqNo]);

  const statusOptions = useMemo(() => {
    if (!data?.workflowStatus) return defaultStatuses;
    return defaultStatuses.includes(data.workflowStatus)
      ? defaultStatuses
      : [data.workflowStatus, ...defaultStatuses];
  }, [data]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {
        workflowStatus,
        assignee,
      };
      if (salesReply !== (data.salesReply || "")) {
        updates.salesReply = salesReply;
        updates.salesReplyDate = new Date().toISOString();
      }
      if (pmReply !== (data.pmReply || "")) {
        updates.pmReply = pmReply;
        updates.pmReplyDate = new Date().toISOString();
      }
      await patchDetail(area, rfqNo, updates);
      setData({ 
        ...data, 
        workflowStatus, 
        assignee, 
        salesReply,
        pmReply,
        salesReplyDate: updates.salesReplyDate || data.salesReplyDate,
        pmReplyDate: updates.pmReplyDate || data.pmReplyDate,
        updatedAt: new Date().toISOString() 
      });
      alert("更新成功");
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-600">載入中...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  const entries = Object.entries(data);

  const formatValue = (key: string, value: unknown): string => {
    if (!value) return "";
    // 檢查是否為日期欄位
    const dateKeys = ["createdAt", "updatedAt", "date", "Date", "sales apply date", "Sales Apply Date", "target mp schedule", "Target MP schedule", "quotation reply date", "Quotation reply date", "rfq start date", "RFQ start date", "rfq close date", "RFQ close date", "1st sample provide date", "1st Sample provide date", "salesReplyDate", "pmReplyDate"];
    if (dateKeys.some(dk => key.toLowerCase().includes(dk.toLowerCase()))) {
      // 嘗試解析為日期
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return date.toLocaleString("zh-TW", { 
          year: "numeric", 
          month: "2-digit", 
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }
    return String(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
          >
            ← 返回主頁
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {area.toUpperCase()} RFQ - {data.rfqNo}
            </h1>
            <p className="text-sm text-gray-600">查看與更新流程資訊</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={workflowStatus}
            onChange={(e) => setWorkflowStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">回覆區</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales 回覆</label>
              <textarea
                value={salesReply}
                onChange={(e) => setSalesReply(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="輸入 Sales 回覆..."
              />
              {data.salesReplyDate && (
                <p className="text-xs text-gray-500 mt-1">
                  回覆時間: {formatValue("salesReplyDate", data.salesReplyDate)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PM 回覆</label>
              <textarea
                value={pmReply}
                onChange={(e) => setPmReply(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="輸入 PM 回覆..."
              />
              {data.pmReplyDate && (
                <p className="text-xs text-gray-500 mt-1">
                  回覆時間: {formatValue("pmReplyDate", data.pmReplyDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">欄位</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.filter(([k]) => !["salesReply", "pmReply", "salesReplyDate", "pmReplyDate"].includes(k)).map(([k, v]) => (
                <tr key={k}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap">{k}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 break-all">{formatValue(k, v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

