"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RfqNewSelectPage() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<"system" | "mb" | null>(null);

  const handleSelect = (area: "system" | "mb") => {
    router.push(`/rfq/${area}/new`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/rfq"
            className="inline-block rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
          >
            ← 返回 RFQ 系統
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">新增 RFQ</h1>
          <p className="text-sm text-gray-600 mb-6 text-center">請選擇要建立的 RFQ 類型</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect("system")}
              className="rounded-lg bg-blue-600 text-white px-6 py-4 text-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              System RFQ
            </button>
            <button
              onClick={() => handleSelect("mb")}
              className="rounded-lg bg-indigo-600 text-white px-6 py-4 text-lg font-medium hover:bg-indigo-700 transition-colors shadow-md"
            >
              MB RFQ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
