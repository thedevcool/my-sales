"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { RepHeader } from "@/components/RepHeader"
import { Receipt, TrendingUp, ShoppingBag } from "lucide-react"

interface SaleRecord {
  id: string
  timestamp: string
  receiptRef: string
  productName: string
  staffName: string
  qty: number
  enteredPrice: number
  discount: number
  totalAmount: number
  grossProfit: number
  paymentMethod: string
  customer: string | null
}

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All Time" },
] as const

export default function RepHistoryPage() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"today" | "week" | "all">("today")

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/sales?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => active && setSales(Array.isArray(d) ? d : []))
      .catch(() => active && setSales([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [filter])

  const totalAmount = sales.reduce((s, x) => s + x.totalAmount, 0)
  const totalProfit = sales.reduce((s, x) => s + x.grossProfit, 0)

  return (
    <div className="min-h-screen">
      <RepHeader />

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10">
        <h1 className="text-xl font-bold text-slate-900 mb-4">My Sales</h1>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <SummaryCard icon={ShoppingBag} label="Sales" value={loading ? "—" : String(sales.length)} />
          <SummaryCard icon={Receipt} label="Revenue" value={loading ? "—" : formatCurrency(totalAmount)} />
          <SummaryCard icon={TrendingUp} label="Profit" value={loading ? "—" : formatCurrency(totalProfit)} accent />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.key ? "bg-slate-900 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[88px] rounded-2xl" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="card text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">No sales yet</p>
            <p className="text-xs text-slate-400 mt-1">Sales you make will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((s, i) => (
              <div
                key={s.id}
                className="card card-hover p-4 animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{s.productName}</div>
                    <div className="text-xs text-slate-400">{s.receiptRef}{s.customer ? ` · ${s.customer}` : ""}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-bold text-sm text-slate-900">{formatCurrency(s.totalAmount)}</div>
                    <div className="text-xs text-green-600 font-medium">+{formatCurrency(s.grossProfit)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{formatDateTime(new Date(s.timestamp))}</span>
                  <span className="flex items-center gap-2">
                    <span>{s.qty} × {formatCurrency(s.enteredPrice)}</span>
                    <span className="badge badge-gray">{s.paymentMethod}</span>
                  </span>
                </div>
                {s.discount > 0 && (
                  <div className="text-xs text-amber-600 mt-1.5">Discount −{formatCurrency(s.discount)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof Receipt; label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3.5">
      <Icon className={`w-4 h-4 mb-2 ${accent ? "text-green-600" : "text-indigo-500"}`} />
      <div className="text-[0.7rem] text-slate-400 font-medium">{label}</div>
      <div className={`text-sm font-bold truncate ${accent ? "text-green-600" : "text-slate-900"}`}>{value}</div>
    </div>
  )
}
