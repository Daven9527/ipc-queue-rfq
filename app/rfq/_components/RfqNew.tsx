"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RfqArea } from "./types";

const areaLabel: Record<RfqArea, string> = {
  system: "System RFQ",
  mb: "MB RFQ",
};

// System RFQ欄位 (C到AF，即索引2到31)
const systemFields = [
  { key: "Sales Apply Date", label: "Sales Apply Date", type: "date" },
  { key: "Sales", label: "Sales", type: "text" },
  { key: "Sales Territory", label: "Sales Territory", type: "text" },
  { key: "Customer", label: "Customer", type: "text" },
  { key: "Target Market", label: "Target Market", type: "text" },
  { key: " Vertical markets", label: "Vertical markets", type: "text" },
  { key: "FCST/\r\nper year", label: "FCST/per year", type: "text" },
  { key: "Life Cycle", label: "Life Cycle", type: "text" },
  { key: "Model", label: "Model", type: "text" },
  { key: "1st sample provide date", label: "1st sample provide date", type: "date" },
  { key: "Target MP schedule\r\n(必填)", label: "Target MP schedule (必填)", type: "text" },
  { key: "Quotation reply date\r\n(必填)", label: "Quotation reply date (必填)", type: "date" },
  { key: "Target price", label: "Target price", type: "text" },
  { key: "System level\r\n(下拉選單)", label: "System level (下拉選單)", type: "text" },
  { key: "Platform", label: "Platform", type: "text" },
  { key: "CPU type \r\n(下拉選單)", label: "CPU type (下拉選單)", type: "text" },
  { key: "Chassis dimension", label: "Chassis dimension", type: "text" },
  { key: "CPU spec.", label: "CPU spec.", type: "text" },
  { key: "Memory", label: "Memory", type: "text" },
  { key: "Storage", label: "Storage", type: "text" },
  { key: "LAN ", label: "LAN", type: "text" },
  { key: "I/O Interface", label: "I/O Interface", type: "text" },
  { key: "WiFi", label: "WiFi", type: "text" },
  { key: "Anteena", label: "Anteena", type: "text" },
  { key: "OS", label: "OS", type: "text" },
  { key: "Accessory ", label: "Accessory", type: "text" },
  { key: "Packing requirment", label: "Packing requirment", type: "text" },
  { key: "環溫", label: "環溫", type: "text" },
  { key: "Certification/Regulation", label: "Certification/Regulation", type: "text" },
  { key: "Special spec./requirment ", label: "Special spec./requirment", type: "textarea" },
];

// MB RFQ欄位 (C到AE，即索引2到30)
const mbFields = [
  { key: "Sales Apply Date", label: "Sales Apply Date", type: "date" },
  { key: "Sales", label: "Sales", type: "text" },
  { key: "Sales Territory", label: "Sales Territory", type: "text" },
  { key: "Customer", label: "Customer", type: "text" },
  { key: "Target Market", label: "Target Market", type: "text" },
  { key: " Vertical markets", label: "Vertical markets", type: "text" },
  { key: "FCST/\r\nper year", label: "FCST/per year", type: "text" },
  { key: "Life Cycle", label: "Life Cycle", type: "text" },
  { key: "Model", label: "Model", type: "text" },
  { key: "1st sample provide date", label: "1st sample provide date", type: "date" },
  { key: "Target MP schedule\r\n(必填)", label: "Target MP schedule (必填)", type: "text" },
  { key: "Quotation reply date\r\n(必填)", label: "Quotation reply date (必填)", type: "date" },
  { key: "Target price", label: "Target price", type: "text" },
  { key: "Platform", label: "Platform", type: "text" },
  { key: "CPU type \r\n(下拉選單)", label: "CPU type (下拉選單)", type: "text" },
  { key: "MB dimension", label: "MB dimension", type: "text" },
  { key: "New Project or Modification Project", label: "New Project or Modification Project", type: "text" },
  { key: "New Project SPEC", label: "New Project SPEC", type: "textarea" },
  { key: "Modification-Project SPEC (List different)", label: "Modification-Project SPEC (List different)", type: "textarea" },
  { key: "CPU", label: "CPU", type: "text" },
  { key: "Memory", label: "Memory", type: "text" },
  { key: "Storage", label: "Storage", type: "text" },
  { key: "WiFi", label: "WiFi", type: "text" },
  { key: "OS", label: "OS", type: "text" },
  { key: "Accessory ", label: "Accessory", type: "text" },
  { key: "Packing requirment", label: "Packing requirment", type: "text" },
  { key: "環溫", label: "環溫", type: "text" },
  { key: "Certification/Regulation", label: "Certification/Regulation", type: "text" },
  { key: "Other requirment ", label: "Other requirment", type: "textarea" },
];

async function getNextRfqNo(area: RfqArea): Promise<string> {
  const res = await fetch(`/api/rfq/${area}`);
  if (!res.ok) return "";
  const data = await res.json();
  const ids = (data.ids as string[]) || [];
  if (ids.length === 0) {
    return area === "system" ? "RFQ(S)-000" : "RFQ(M)-000";
  }
  
  // 找出最大的編號
  let maxNum = -1;
  const pattern = area === "system" ? /^RFQ\(S\)-(\d+)$/ : /^RFQ\(M\)-(\d+)$/;
  for (const id of ids) {
    const match = id.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  return area === "system" 
    ? `RFQ(S)-${nextNum.toString().padStart(3, "0")}`
    : `RFQ(M)-${nextNum.toString().padStart(3, "0")}`;
}

async function createRfq(area: RfqArea, data: Record<string, string>) {
  const res = await fetch(`/api/rfq/${area}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "建立失敗");
  }
  const result = await res.json();
  return result.rfqNo as string;
}

async function updateRfq(area: RfqArea, rfqNo: string, data: Record<string, string>) {
  const res = await fetch(`/api/rfq/${area}/${encodeURIComponent(rfqNo)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "更新失敗");
  }
}

// 日期字串轉換為Excel日期序列號
function dateStringToExcelDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const excelEpoch = new Date(1899, 11, 30);
  const diff = date.getTime() - excelEpoch.getTime();
  const days = Math.round(diff / 86400000);
  return String(days);
}

export default function RfqNew({ area }: { area: RfqArea }) {
  const fields = area === "system" ? systemFields : mbFields;
  const router = useRouter();
  const [rfqNo, setRfqNo] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingRfqNo, setLoadingRfqNo] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    // 自動載入下一個RFQ No
    const loadNextRfqNo = async () => {
      setLoadingRfqNo(true);
      try {
        const nextNo = await getNextRfqNo(area);
        setRfqNo(nextNo);
      } catch (error) {
        console.error("Failed to load next RFQ No", error);
      } finally {
        setLoadingRfqNo(false);
      }
    };
    loadNextRfqNo();
  }, [area]);

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const rfqNoToUse = rfqNo.trim() || await getNextRfqNo(area);
      
      // 先建立RFQ
      const createdRfqNo = await createRfq(area, { rfqNo: rfqNoToUse });
      
      // 然後更新所有欄位，將日期欄位轉換為Excel日期序列號
      const updates: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (!value) return;
        // 檢查是否為日期欄位
        const dateFields = ["Sales Apply Date", "1st sample provide date", "Quotation reply date\r\n(必填)"];
        if (dateFields.some(df => key.includes(df) || df.includes(key))) {
          const excelDate = dateStringToExcelDate(value);
          if (excelDate) {
            updates[key] = excelDate;
          }
        } else {
          updates[key] = value;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await updateRfq(area, createdRfqNo, updates);
      }
      
      setMsg(`建立成功！RFQ No: ${createdRfqNo}`);
      setTimeout(() => {
        router.push(`/rfq/${area}/${encodeURIComponent(createdRfqNo)}`);
      }, 1500);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/rfq"
          className="rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
        >
          ← 返回 RFQ 系統
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{areaLabel[area]} 新增</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl shadow-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RFQ No <span className="text-gray-500 text-xs">(自動生成，可手動修改)</span>
          </label>
          <input
            value={rfqNo}
            onChange={(e) => setRfqNo(e.target.value)}
            disabled={loadingRfqNo}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            placeholder={loadingRfqNo ? "載入中..." : "RFQ No"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {fields.map((field) => (
            <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.label.includes("(必填)") && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={formData[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>
          ))}
        </div>

        {msg && (
          <div className={`text-sm p-3 rounded-lg ${msg.includes("成功") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {msg}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || loadingRfqNo}
            className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "建立中..." : "建立 RFQ"}
          </button>
          <Link
            href="/rfq"
            className="rounded-lg bg-gray-200 text-gray-800 px-6 py-2 text-sm font-medium hover:bg-gray-300"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

