"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

async function fetchIds(area: "system" | "mb", status?: string) {
  const url = new URL(`/api/rfq/${area}`, window.location.origin);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return (data.ids as string[]) || [];
}

async function fetchDetail(area: "system" | "mb", rfqNo: string) {
  const res = await fetch(`/api/rfq/${area}/${encodeURIComponent(rfqNo)}`);
  if (!res.ok) return null;
  return await res.json();
}

export default function RfqDashboard() {
  const [systemCount, setSystemCount] = useState(0);
  const [mbCount, setMbCount] = useState(0);
  const [systemByStatus, setSystemByStatus] = useState<Record<string, number>>({});
  const [mbByStatus, setMbByStatus] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const sysIds = await fetchIds("system");
      const mbIds = await fetchIds("mb");
      setSystemCount(sysIds.length);
      setMbCount(mbIds.length);

      // 取得所有RFQ的詳細資料以統計實際的status
      const [sysDetails, mbDetails] = await Promise.all([
        Promise.all(sysIds.map(id => fetchDetail("system", id))),
        Promise.all(mbIds.map(id => fetchDetail("mb", id))),
      ]);

      const sysStatus: Record<string, number> = {};
      const mbStatus: Record<string, number> = {};

      sysDetails.forEach((detail) => {
        if (detail) {
          const status = detail.workflowStatus || detail["RFQ Status"] || detail["Status"] || "new";
          sysStatus[status] = (sysStatus[status] || 0) + 1;
        }
      });

      mbDetails.forEach((detail) => {
        if (detail) {
          const status = detail.workflowStatus || detail["RFQ Status"] || detail["Status"] || "new";
          mbStatus[status] = (mbStatus[status] || 0) + 1;
        }
      });

      setSystemByStatus(sysStatus);
      setMbByStatus(mbStatus);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
            >
              ← 返回首頁
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">RFQ 流程系統</h1>
              <p className="text-sm text-gray-600 mt-1">System / MB RFQ 狀態總覽</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/rfq/export");
                  if (!res.ok) {
                    alert("匯出失敗");
                    return;
                  }
                  
                  // 獲取文件名
                  const contentDisposition = res.headers.get("Content-Disposition");
                  let fileName = "RFQ資料.xlsx";
                  if (contentDisposition) {
                    const matchUtf8 = contentDisposition.match(/filename\*\=UTF-8''([^;]+)/i);
                    if (matchUtf8?.[1]) {
                      fileName = decodeURIComponent(matchUtf8[1]);
                    } else {
                      const fileNameMatch = contentDisposition.match(/filename="?([^\";]+)"?/i);
                      if (fileNameMatch?.[1]) {
                        fileName = decodeURIComponent(fileNameMatch[1]);
                      }
                    }
                  }

                  // 下載文件
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error("Export failed", error);
                  alert("匯出失敗");
                }
              }}
              className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700"
            >
              匯出 Excel
            </button>
            <Link href="/rfq/system" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
              System RFQ
            </Link>
            <Link href="/rfq/mb" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
              MB RFQ
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="System RFQ" total={systemCount} byStatus={systemByStatus} />
          <Card title="MB RFQ" total={mbCount} byStatus={mbByStatus} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, total, byStatus }: { title: string; total: number; byStatus: Record<string, number> }) {
  return (
    <div className="rounded-xl bg-white shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <span className="text-lg font-bold text-blue-600">共 {total}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(byStatus).map(([k, v]) => (
          <span key={k} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800">
            {k}: {v}
          </span>
        ))}
        {Object.keys(byStatus).length === 0 && <span className="text-sm text-gray-500">載入中...</span>}
      </div>
    </div>
  );
}

