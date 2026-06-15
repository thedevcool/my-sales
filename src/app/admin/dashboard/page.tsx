"use client"

import { useState, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import {
  Wallet,
  TrendingUp,
  ReceiptText,
  Boxes,
  AlertTriangle,
  Trophy,
  CreditCard,
} from "lucide-react"

interface DashboardData {
  totalSales: number
  totalProfit: number
  totalTransactions: number
  totalStock: number
  lowStockCount: number
  topProducts: { name: string; qty: number; amount: number }[]
  lowStockItems: { sku: string; name: string; currentStock: number; reorderLevel: number }[]
  weeklyTrend: { label: string; day: string; amount: number }[]
  paymentBreakdown: { method: string; amount: number }[]
}

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("week")

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/admin/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [range])

  const paymentTotal = data?.paymentBreakdown.reduce((s, p) => s + p.amount, 0) || 0

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of sales, profit and stock"
        actions={
          <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto hide-scrollbar">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  range === r.key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Wallet} label="Total Sales" value={formatCurrency(data.totalSales)} tone="indigo" />
            <StatCard icon={TrendingUp} label="Gross Profit" value={formatCurrency(data.totalProfit)} tone="green" />
            <StatCard icon={ReceiptText} label="Transactions" value={String(data.totalTransactions)} tone="slate" />
            <StatCard icon={Boxes} label="Units in Stock" value={String(data.totalStock)} tone="violet" sub={`${data.lowStockCount} low-stock item${data.lowStockCount !== 1 ? "s" : ""}`} subTone={data.lowStockCount > 0 ? "red" : "muted"} />
          </div>

          {/* Trend chart + payment split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-slate-900">Sales — last 7 days</h3>
                <span className="text-xs text-slate-400">
                  {formatCurrency(data.weeklyTrend.reduce((s, d) => s + d.amount, 0))} total
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weeklyTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                      width={42}
                    />
                    <Tooltip
                      cursor={{ stroke: "#c7d2fe", strokeWidth: 1 }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e6e8ee", boxShadow: "0 10px 24px -6px rgba(15,23,42,0.12)", fontSize: 13 }}
                      formatter={(v: number) => [formatCurrency(v), "Sales"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2.5} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" /> Payment Methods
              </h3>
              {data.paymentBreakdown.length === 0 ? (
                <p className="text-sm text-slate-400">No sales in this range</p>
              ) : (
                <div className="space-y-4">
                  {data.paymentBreakdown.map((p) => {
                    const pct = paymentTotal > 0 ? Math.round((p.amount / paymentTotal) * 100) : 0
                    return (
                      <div key={p.method}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-600 font-medium">{p.method}</span>
                          <span className="text-slate-900 font-semibold">{formatCurrency(p.amount)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Top Products
              </h3>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-slate-400">No sales data</p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                        }`}>{i + 1}</span>
                        <span className="text-sm text-slate-700 truncate">{p.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-semibold text-slate-900">{p.qty} sold</div>
                        <div className="text-xs text-slate-400">{formatCurrency(p.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock Alert
              </h3>
              {data.lowStockItems.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> All items are well stocked
                </div>
              ) : (
                <div className="space-y-3">
                  {data.lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-700 truncate">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.sku}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-semibold text-red-500">{item.currentStock} left</div>
                        <div className="text-xs text-slate-400">reorder at {item.reorderLevel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 text-slate-500">Failed to load dashboard</div>
      )}
    </div>
  )
}

const TONES: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: "bg-indigo-50", fg: "text-indigo-600" },
  green: { bg: "bg-green-50", fg: "text-green-600" },
  violet: { bg: "bg-violet-50", fg: "text-violet-600" },
  slate: { bg: "bg-slate-100", fg: "text-slate-600" },
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  sub,
  subTone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: keyof typeof TONES
  sub?: string
  subTone?: "red" | "muted"
}) {
  const t = TONES[tone]
  return (
    <div className="card card-hover p-5">
      <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${t.fg}`} />
      </div>
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900 truncate">{value}</div>
      {sub && (
        <div className={`text-xs mt-1 ${subTone === "red" ? "text-red-500 font-medium" : "text-slate-400"}`}>{sub}</div>
      )}
    </div>
  )
}
