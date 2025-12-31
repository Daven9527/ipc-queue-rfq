"use client";

import { useEffect, useMemo, useState } from "react";
import type { RfqArea, RfqRecord } from "./types";

const statuses = ["new", "processing", "done"];

const areaLabel: Record<RfqArea, string> = {
  system: "System RFQ",
  mb: "MB RFQ",
};

async function fetchIds(area: RfqArea) {
  const res = await fetch(`/api/rfq/${area}`);
  if (!res.ok) throw new Error("載入 RFQ 失敗");
  const data = await res.json();
  return (data.ids as string[]) || [];
}

async function fetchDetail(area: RfqArea, rfqNo: string): Promise<RfqRecord | null> {
  const res = await fetch(`/api/rfq/${area}/${encodeURIComponent(rfqNo)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return { rfqNo, ...data };
}

function field(record: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    const v = record[k];
    if (v) return v;
    const lower = record[k.toLowerCase()];
    if (lower) return lower;
  }
  return "";
}

type SortField = "rfqNo" | "updatedAt" | "customer" | "sales" | "status" | "assignedPM";
type SortOrder = "asc" | "desc";

export default function RfqList({ area }: { area: RfqArea }) {
  const [ids, setIds] = useState<string[]>([]);
  const [rows, setRows] = useState<RfqRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [pmFilter, setPmFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchIds(area);
        setIds(list);
        const details = await Promise.all(list.map((id) => fetchDetail(area, id)));
        setRows(details.filter(Boolean) as RfqRecord[]);
      } catch (e) {
        setError("載入失敗，請重試");
      } finally {
        setLoading(false);
      }
    })();
  }, [area]);

  // 取得所有唯一的狀態和 PM 列表用於篩選選項
  const statusOptions = useMemo(() => {
    const statusSet = new Set<string>();
    rows.forEach((r) => {
      const status = r.workflowStatus || r["RFQ Status"] || r["Status"] || "new";
      statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }, [rows]);

  const pmOptions = useMemo(() => {
    const pmSet = new Set<string>();
    rows.forEach((r) => {
      const pm = field(r, ["Assigned PM", "assigned PM", "assignedPM", "assignee"]);
      if (pm) pmSet.add(pm);
    });
    return Array.from(pmSet).sort();
  }, [rows]);

  const filteredAndSorted = useMemo(() => {
    let result = [...rows];

    // 搜尋篩選
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const customer = field(r, ["customer", "Customer", "客戶", "客戶名稱"]).toLowerCase();
        const sales = field(r, ["sales", "Sales", "業務"]).toLowerCase();
        return (
          r.rfqNo.toLowerCase().includes(q) ||
          customer.includes(q) ||
          sales.includes(q)
        );
      });
    }

    // 狀態篩選
    if (statusFilter) {
      result = result.filter((r) => {
        const status = r.workflowStatus || r["RFQ Status"] || r["Status"] || "new";
        return status === statusFilter;
      });
    }

    // PM 篩選
    if (pmFilter) {
      result = result.filter((r) => {
        const pm = field(r, ["Assigned PM", "assigned PM", "assignedPM", "assignee"]);
        return pm === pmFilter;
      });
    }

    // 排序
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "rfqNo":
          aVal = a.rfqNo;
          bVal = b.rfqNo;
          break;
        case "updatedAt":
          aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        case "customer":
          aVal = field(a, ["customer", "Customer", "客戶", "客戶名稱"]).toLowerCase();
          bVal = field(b, ["customer", "Customer", "客戶", "客戶名稱"]).toLowerCase();
          break;
        case "sales":
          aVal = field(a, ["sales", "Sales", "業務"]).toLowerCase();
          bVal = field(b, ["sales", "Sales", "業務"]).toLowerCase();
          break;
        case "status":
          aVal = a.workflowStatus || a["RFQ Status"] || a["Status"] || "new";
          bVal = b.workflowStatus || b["RFQ Status"] || b["Status"] || "new";
          break;
        case "assignedPM":
          aVal = field(a, ["Assigned PM", "assigned PM", "assignedPM", "assignee"]).toLowerCase();
          bVal = field(b, ["Assigned PM", "assigned PM", "assignedPM", "assignee"]).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, query, statusFilter, pmFilter, sortField, sortOrder]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
          >
            ← 返回主頁
          </a>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{areaLabel[area]} 列表</h1>
            <p className="text-sm text-gray-600">
              共 {ids.length} 筆 {filteredAndSorted.length !== ids.length && `（顯示 ${filteredAndSorted.length} 筆）`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋 RFQ No / 客戶 / 業務"
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部狀態</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={pmFilter}
            onChange={(e) => setPmFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部 PM</option>
            {pmOptions.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split("-") as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="updatedAt-desc">更新時間 ↓</option>
            <option value="updatedAt-asc">更新時間 ↑</option>
            <option value="rfqNo-asc">RFQ No ↑</option>
            <option value="rfqNo-desc">RFQ No ↓</option>
            <option value="customer-asc">客戶 ↑</option>
            <option value="customer-desc">客戶 ↓</option>
            <option value="sales-asc">業務 ↑</option>
            <option value="sales-desc">業務 ↓</option>
            <option value="status-asc">狀態 ↑</option>
            <option value="status-desc">狀態 ↓</option>
            <option value="assignedPM-asc">Assigned PM ↑</option>
            <option value="assignedPM-desc">Assigned PM ↓</option>
          </select>
          <a
            href={`/rfq/${area}/new`}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            新增
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">載入中...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-gray-500">目前沒有符合條件的資料</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">RFQ No</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">客戶</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">業務</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">流程狀態</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Assigned PM</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">更新時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.map((r) => {
                const customer = field(r, ["customer", "Customer", "客戶", "客戶名稱"]);
                const sales = field(r, ["sales", "Sales", "業務"]);
                const assignedPM = field(r, ["Assigned PM", "assigned PM", "assignedPM", "assignee"]);
                const status = r.workflowStatus || "new";
                const updatedAt = r.updatedAt
                  ? new Date(r.updatedAt).toLocaleString("zh-TW")
                  : "";
                return (
                  <tr key={r.rfqNo} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-blue-700 font-medium">
                      <a href={`/rfq/${area}/${encodeURIComponent(r.rfqNo)}`} className="hover:underline">
                        {r.rfqNo}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800">{customer}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">{sales}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800">{assignedPM}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

