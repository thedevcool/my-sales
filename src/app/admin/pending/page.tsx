"use client"

import { useState, useEffect, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import { Modal } from "@/components/ui/Modal"
import { Combobox } from "@/components/ui/Combobox"
import { toast } from "@/components/ui/sonner"
import { ClipboardCheck, Upload, UserPlus, PencilLine, CheckCircle2 } from "lucide-react"

interface Pending {
  id: string
  name: string
  brandInput: string | null
  categoryInput: string | null
  unitCost: number
  startingPrice: number
  suggestedPrice: number
  openingStock: number
  reorderLevel: number
  barcode: string | null
  source: string
  reason: string | null
  qtySold: number | null
  reportedByName: string | null
  createdAt: string
}

const SOURCE_META: Record<string, { label: string; icon: typeof Upload; cls: string }> = {
  import: { label: "Import", icon: Upload, cls: "badge-brand" },
  manual: { label: "Manual", icon: PencilLine, cls: "badge-gray" },
  "staff-sale": { label: "Rep sale", icon: UserPlus, cls: "badge-amber" },
}

export default function AdminPendingPage() {
  const [items, setItems] = useState<Pending[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<Pending | null>(null)

  const load = useCallback(() => {
    fetch("/api/admin/pending").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([])).finally(() => setLoading(false))
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d.map((c: { name: string }) => c.name) : [])).catch(() => {})
    fetch("/api/admin/brands").then((r) => r.json()).then((d) => setBrands(Array.isArray(d) ? d.map((b: { name: string }) => b.name) : [])).catch(() => {})
  }, [])

  useEffect(load, [load])

  async function reject(item: Pending) {
    try {
      const res = await fetch("/api/admin/pending", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) })
      if (!res.ok) throw new Error()
      toast.success(`Rejected ${item.name}`)
      setTarget(null)
      load()
    } catch {
      toast.error("Could not reject")
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader title="Pending Products" subtitle="Sort these into your catalogue — pick a category & brand, then approve." />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">Nothing pending</p>
          <p className="text-xs text-slate-400 mt-1">Imported or rep-reported products that need sorting will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const meta = SOURCE_META[item.source] || SOURCE_META.import
            const Icon = meta.icon
            return (
              <div key={item.id} className="card card-hover p-4 animate-slide-up" style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900">{item.name}</span>
                      <span className={`badge ${meta.cls}`}><Icon className="w-3 h-3" /> {meta.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {item.categoryInput ? <>Category: <strong>{item.categoryInput}</strong> · </> : null}
                      {item.brandInput ? <>Brand: <strong>{item.brandInput}</strong></> : (item.source === "staff-sale" ? `Sold by ${item.reportedByName || "a rep"}${item.qtySold ? ` ×${item.qtySold}` : ""}` : null)}
                    </div>
                    {item.reason && <div className="text-xs text-amber-600 mt-1">{item.reason}</div>}
                    <div className="text-xs text-slate-400 mt-1.5">
                      {item.suggestedPrice > 0 && <>sells {formatCurrency(item.suggestedPrice)} · </>}
                      cost {formatCurrency(item.unitCost)}
                    </div>
                  </div>
                  <button onClick={() => setTarget(item)} className="btn btn-primary btn-sm flex-shrink-0">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReviewModal
        target={target}
        categories={categories}
        brands={brands}
        onClose={() => setTarget(null)}
        onReject={reject}
        onApproved={() => { setTarget(null); load() }}
      />
    </div>
  )
}

function ReviewModal({
  target, categories, brands, onClose, onReject, onApproved,
}: {
  target: Pending | null
  categories: string[]
  brands: string[]
  onClose: () => void
  onReject: (item: Pending) => void
  onApproved: () => void
}) {
  const [form, setForm] = useState({ name: "", category: "", brand: "", unitCost: "", startingPrice: "", suggestedPrice: "", openingStock: "", reorderLevel: "5", barcode: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      setForm({
        name: target.name,
        category: target.categoryInput || "",
        brand: target.brandInput || "",
        unitCost: String(target.unitCost || ""),
        startingPrice: String(target.startingPrice || ""),
        suggestedPrice: String(target.suggestedPrice || ""),
        openingStock: String(target.openingStock || ""),
        reorderLevel: String(target.reorderLevel || 5),
        barcode: target.barcode || "",
      })
    }
  }, [target])

  async function approve(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    if (!form.name.trim() || !form.category.trim()) {
      toast.error("Product name and category are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          name: form.name,
          categoryName: form.category,
          brandName: form.brand || "Generic",
          unitCost: form.unitCost,
          startingPrice: form.startingPrice,
          suggestedPrice: form.suggestedPrice,
          openingStock: form.openingStock,
          reorderLevel: form.reorderLevel,
          barcode: form.barcode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not approve")
      toast.success("Added to catalogue", { description: `${form.name} · SKU ${data.sku}` })
      onApproved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve")
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Review Product"
      description="Confirm the details, then approve it into your catalogue."
      footer={
        <>
          {target && <button onClick={() => onReject(target)} className="btn btn-ghost btn-md text-red-500 hover:bg-red-50 mr-auto">Reject</button>}
          <button onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
          <button onClick={approve} disabled={saving} className="btn btn-primary btn-md">{saving ? "Approving…" : "Approve & Add"}</button>
        </>
      }
    >
      <form onSubmit={approve} className="space-y-4">
        <div>
          <label className="label">Product name</label>
          <input value={form.name} onChange={(e) => set("name")(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <Combobox value={form.category} onChange={set("category")} options={categories} placeholder="Choose or type" noun="category" />
          </div>
          <div>
            <label className="label">Brand</label>
            <Combobox value={form.brand} onChange={set("brand")} options={brands} placeholder="Choose or type" noun="brand" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Unit cost" value={form.unitCost} onChange={set("unitCost")} />
          <NumField label="Min price" value={form.startingPrice} onChange={set("startingPrice")} />
          <NumField label="Sell price" value={form.suggestedPrice} onChange={set("suggestedPrice")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Opening stock" value={form.openingStock} onChange={set("openingStock")} />
          <NumField label="Reorder level" value={form.reorderLevel} onChange={set("reorderLevel")} />
          <div>
            <label className="label">Barcode</label>
            <input value={form.barcode} onChange={(e) => set("barcode")(e.target.value)} placeholder="optional" className="input" />
          </div>
        </div>
        <p className="text-xs text-slate-400">A SKU is generated automatically from the brand when you approve.</p>
      </form>
    </Modal>
  )
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className="input" />
    </div>
  )
}
