"use client"

import { useState, useEffect, useCallback } from "react"
import { Modal } from "@/components/ui/Modal"
import { toast } from "@/components/ui/sonner"
import { Plus, Trash2, Tag, Boxes } from "lucide-react"

interface Item { id: string; name: string; code?: string }

export function CatalogManagerModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const [categories, setCategories] = useState<Item[]>([])
  const [brands, setBrands] = useState<Item[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
    ])
      .then(([c, b]) => {
        setCategories(Array.isArray(c) ? c : [])
        setBrands(Array.isArray(b) ? b : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function add(kind: "categories" | "brands", name: string) {
    if (!name.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add")
      toast.success(`Added ${name.trim()}`)
      if (kind === "categories") setNewCategory("")
      else setNewBrand("")
      load()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add")
    } finally {
      setBusy(false)
    }
  }

  async function remove(kind: "categories" | "brands", id: string, name: string) {
    try {
      const res = await fetch(`/api/admin/${kind}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not remove")
      }
      toast.success(`Removed ${name}`)
      load()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Categories & Brands" description="These power the dropdowns and SKUs when you add products.">
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Categories */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-indigo-500" /> Categories
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); add("categories", newCategory) }} className="flex gap-2 mb-3">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="input py-2 text-sm" />
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm flex-shrink-0"><Plus className="w-4 h-4" /></button>
          </form>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                <span className="text-slate-700">{c.name}</span>
                <button onClick={() => remove("categories", c.id, c.name)} className="text-slate-300 hover:text-red-500" title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-slate-400">No categories yet</p>}
          </div>
        </div>

        {/* Brands */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <Boxes className="w-4 h-4 text-indigo-500" /> Brands
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); add("brands", newBrand) }} className="flex gap-2 mb-3">
            <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="New brand" className="input py-2 text-sm" />
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm flex-shrink-0"><Plus className="w-4 h-4" /></button>
          </form>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                <span className="text-slate-700">{b.name} <span className="text-slate-400 text-xs font-mono">{b.code}</span></span>
                <button onClick={() => remove("brands", b.id, b.name)} className="text-slate-300 hover:text-red-500" title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {brands.length === 0 && <p className="text-xs text-slate-400">No brands yet</p>}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-5">Brand codes (e.g. <span className="font-mono">ORA</span>) are used to auto-generate product SKUs like <span className="font-mono">ORA-001</span>.</p>
    </Modal>
  )
}
