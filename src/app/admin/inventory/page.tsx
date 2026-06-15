"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import { RestockModal, type RestockTarget } from "@/components/RestockModal"
import { PackagePlus, Boxes, AlertTriangle, Search } from "lucide-react"

interface Product {
  id: string
  sku: string
  name: string
  currentStock: number
  reorderLevel: number
  unitCost: number
  startingPrice: number
  suggestedPrice: number
  groupName: string
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restockTarget, setRestockTarget] = useState<RestockTarget | null>(null)

  function fetchData() {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchData, [])

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )
  const lowStock = filtered.filter((p) => p.currentStock <= p.reorderLevel)
  const okStock = filtered.filter((p) => p.currentStock > p.reorderLevel)

  const totalUnits = products.reduce((s, p) => s + p.currentStock, 0)
  const stockValue = products.reduce((s, p) => s + p.currentStock * p.unitCost, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader title="Inventory" subtitle="Stock levels and restocking" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={Boxes} label="Products" value={loading ? "—" : String(products.length)} tone="indigo" />
        <SummaryCard icon={Boxes} label="Units in Stock" value={loading ? "—" : String(totalUnits)} tone="violet" />
        <SummaryCard icon={AlertTriangle} label="Low Stock" value={loading ? "—" : String(products.filter((p) => p.currentStock <= p.reorderLevel).length)} tone="red" />
        <SummaryCard icon={Boxes} label="Stock Value" value={loading ? "—" : formatCurrency(stockValue)} tone="green" />
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory…" className="input pl-11" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : (
        <>
          {lowStock.length > 0 && (
            <div className="mb-6">
              <h3 className="section-title mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Needs Restocking ({lowStock.length})
              </h3>
              <div className="space-y-2">
                {lowStock.map((p, i) => (
                  <StockRow key={p.id} p={p} low onRestock={() => setRestockTarget(p)} delay={i} />
                ))}
              </div>
            </div>
          )}

          <h3 className="section-title mb-3">In Stock ({okStock.length})</h3>
          <div className="space-y-2">
            {okStock.map((p, i) => (
              <StockRow key={p.id} p={p} onRestock={() => setRestockTarget(p)} delay={i} />
            ))}
            {filtered.length === 0 && <div className="card text-center py-16 text-sm text-slate-500">No products found</div>}
          </div>
        </>
      )}

      <RestockModal target={restockTarget} onClose={() => setRestockTarget(null)} onSaved={() => { setRestockTarget(null); fetchData() }} />
    </div>
  )
}

function StockRow({ p, low, onRestock, delay }: { p: Product; low?: boolean; onRestock: () => void; delay: number }) {
  return (
    <div className={`card card-hover p-4 flex items-center justify-between gap-3 animate-slide-up ${low ? "border-red-200 bg-red-50/40" : ""}`} style={{ animationDelay: `${Math.min(delay, 12) * 15}ms` }}>
      <div className="min-w-0">
        <div className="font-medium text-sm text-slate-900 truncate">{p.name}</div>
        <div className="text-xs text-slate-400">{p.sku} · {p.groupName}</div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <div className={`text-sm font-bold ${low ? "text-red-600" : "text-slate-900"}`}>{p.currentStock} units</div>
          <div className="text-xs text-slate-400">{low ? `reorder at ${p.reorderLevel}` : `${formatCurrency(p.unitCost)}/unit`}</div>
        </div>
        <button onClick={onRestock} className="btn btn-secondary btn-sm">
          <PackagePlus className="w-3.5 h-3.5" /> Restock
        </button>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  indigo: "text-indigo-600 bg-indigo-50",
  violet: "text-violet-600 bg-violet-50",
  red: "text-red-600 bg-red-50",
  green: "text-green-600 bg-green-50",
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${TONES[tone]}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-base font-bold text-slate-900 truncate">{value}</div>
    </div>
  )
}
