"use client";

import { useEffect, useState } from "react";

const SALES_STORAGE_KEY = "salesAuth";

interface AuthState {
  username: string;
  token: string;
}

interface RfqItem {
  area: "system" | "mb";
  rfqNo: string;
  data: any;
}

export default function SalesPage() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rfqs, setRfqs] = useState<RfqItem[]>([]);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [editingRfq, setEditingRfq] = useState<{ area: "system" | "mb"; rfqNo: string } | null>(null);
  const [salesReply, setSalesReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem(SALES_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AuthState;
        if (parsed?.username && parsed?.token) {
          setAuth(parsed);
        }
      } catch (error) {
        console.error("Failed to parse sales auth cache", error);
      }
    }

    const clearAuth = () => {
      sessionStorage.removeItem(SALES_STORAGE_KEY);
    };
    window.addEventListener("beforeunload", clearAuth);
    return () => {
      window.removeEventListener("beforeunload", clearAuth);
    };
  }, []);

  useEffect(() => {
    if (auth) {
      loadRfqs();
    }
  }, [auth]);

  const loadRfqs = async () => {
    setRfqLoading(true);
    try {
      const [systemIds, mbIds] = await Promise.all([
        fetch("/api/rfq/system").then(r => r.json()).then(d => d.ids || []),
        fetch("/api/rfq/mb").then(r => r.json()).then(d => d.ids || []),
      ]);
      
      const systemData = await Promise.all(
        systemIds.map(async (id: string) => {
          const res = await fetch(`/api/rfq/system/${encodeURIComponent(id)}`);
          const data = await res.json();
          return { area: "system" as const, rfqNo: id, data };
        })
      );
      
      const mbData = await Promise.all(
        mbIds.map(async (id: string) => {
          const res = await fetch(`/api/rfq/mb/${encodeURIComponent(id)}`);
          const data = await res.json();
          return { area: "mb" as const, rfqNo: id, data };
        })
      );
      
      setRfqs([...systemData, ...mbData]);
    } catch (error) {
      console.error("Failed to load RFQs", error);
    } finally {
      setRfqLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || (data.role !== "sales" && data.role !== "super")) {
        setError("登入失敗，請確認帳號密碼");
        return;
      }
      const token = btoa(`${username}:${password}`);
      const newAuth = { username, token };
      setAuth(newAuth);
      sessionStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(newAuth));
      setPassword("");
    } catch (error) {
      setError("登入失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    sessionStorage.removeItem(SALES_STORAGE_KEY);
    setRfqs([]);
  };

  const handleSaveSalesReply = async () => {
    if (!editingRfq || !auth) return;
    setSaving(true);
    try {
      await fetch(`/api/rfq/${editingRfq.area}/${encodeURIComponent(editingRfq.rfqNo)}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth.token}`
        },
        body: JSON.stringify({ salesReply, salesReplyDate: new Date().toISOString() }),
      });
      await loadRfqs();
      setEditingRfq(null);
      setSalesReply("");
      alert("Sales回覆已儲存");
    } catch (error) {
      alert("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">Sales 管理平台登入</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">帳號</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="請輸入帳號"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="請輸入密碼"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "登入中..." : "登入"}
              </button>
            </form>
            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-blue-600 hover:text-blue-800 underline">
                返回首頁
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6">
          <a
            href="/"
            className="inline-block rounded-lg bg-gray-200 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-300"
          >
            ← 返回主頁
          </a>
        </div>
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Sales 管理平台</h1>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm md:text-base text-white font-medium hover:bg-gray-700 transition-colors"
            >
              登出
            </button>
          </div>
          <p className="text-sm md:text-base text-gray-600">
            RFQ Sales 回覆管理 {auth.username ? `｜ 歡迎，${auth.username}` : ""}
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 md:p-6 shadow-lg">
          <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-semibold text-gray-800">RFQ 列表</h2>
          {rfqLoading ? (
            <div className="text-gray-600">載入中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">類型</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">RFQ No</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">客戶</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Sales回覆</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfqs.map((rfq) => {
                    const customer = rfq.data.customer || rfq.data.Customer || "";
                    const currentSalesReply = rfq.data.salesReply || "";
                    const isEditing = editingRfq?.area === rfq.area && editingRfq?.rfqNo === rfq.rfqNo;
                    
                    return (
                      <tr key={`${rfq.area}-${rfq.rfqNo}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800">{rfq.area === "system" ? "System" : "MB"}</td>
                        <td className="px-4 py-2 text-sm">
                          <a href={`/rfq/${rfq.area}/${encodeURIComponent(rfq.rfqNo)}`} className="text-blue-700 hover:underline">
                            {rfq.rfqNo}
                          </a>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">{customer}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {isEditing ? (
                            <textarea
                              value={salesReply}
                              onChange={(e) => setSalesReply(e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              rows={2}
                            />
                          ) : (
                            <div className="max-w-xs truncate">{currentSalesReply || "-"}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveSalesReply}
                                disabled={saving}
                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                儲存
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRfq(null);
                                  setSalesReply("");
                                }}
                                className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRfq({ area: rfq.area, rfqNo: rfq.rfqNo });
                                setSalesReply(currentSalesReply);
                              }}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              編輯Sales回覆
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 md:mt-6 text-center">
          <a href="/" className="text-sm md:text-base text-blue-600 hover:text-blue-800 underline">
            返回首頁
          </a>
        </div>
      </div>
    </div>
  );
}
