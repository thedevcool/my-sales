"use client"

import { useState, useEffect, useCallback } from "react"
import Papa from "papaparse"
import { formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import { Modal } from "@/components/ui/Modal"
import { Combobox } from "@/components/ui/Combobox"
import { RestockModal } from "@/components/RestockModal"
import { CatalogManagerModal } from "@/components/CatalogManagerModal"
import { toast } from "@/components/ui/sonner"
import { Plus, Search, Pencil, PackagePlus, Package, Upload, Download, Tags, ClipboardList, Trash2 } from "lucide-react"
import Link from "next/link"

interface ProductVariant {
  id: string
  sku: string
  name: string
  category: string
  brand: string
  unitCost: number
  startingPrice: number
  suggestedPrice: number
  currentStock: number
  reorderLevel: number
  barcode: string | null
  isActive: boolean
  groupName: string
}

type Draft = {
  name: string
  category: string
  brand: string
  unitCost: string
  startingPrice: string
  suggestedPrice: string
  openingStock: string
  reorderLevel: string
  barcode: string
}

const emptyDraft: Draft = {
  name: "", category: "", brand: "", unitCost: "", startingPrice: "",
  suggestedPrice: "", openingStock: "", reorderLevel: "5", barcode: "",
}

const TEMPLATE_HEADERS = ["name", "brand", "category", "unitCost", "startingPrice", "suggestedPrice", "openingStock", "reorderLevel", "barcode"]

export default function AdminProductsPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductVariant | null>(null)
  const [restockTarget, setRestockTarget] = useState<ProductVariant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVariants = useCallback(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setVariants(Array.isArray(d) ? d : []))
      .catch(() => setVariants([]))
      .finally(() => setLoading(false))
  }, [])

  const fetchLists = useCallback(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d.map((c: { name: string }) => c.name) : [])).catch(() => {})
    fetch("/api/admin/brands").then((r) => r.json()).then((d) => setBrands(Array.isArray(d) ? d.map((b: { name: string }) => b.name) : [])).catch(() => {})
    fetch("/api/admin/pending").then((r) => r.json()).then((d) => setPendingCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
  }, [])

  useEffect(() => { fetchVariants(); fetchLists() }, [fetchVariants, fetchLists])

  const filtered = variants.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.groupName.toLowerCase().includes(search.toLowerCase())
  )

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim() || !draft.category.trim()) {
      toast.error("Product name and category are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add product")
      toast.success("Product added", { description: `${draft.name} · SKU ${data.sku}` })
      setAddOpen(false); setDraft(emptyDraft)
      fetchVariants(); fetchLists()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not delete product")
      if (data.softDeleted) {
        toast.success(`${deleteTarget.name} has sales history — hidden instead of deleted`)
      } else {
        toast.success(`Deleted ${deleteTarget.name}`)
      }
      setDeleteTarget(null)
      fetchVariants(); fetchLists()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete product")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader
        title="Products"
        subtitle={loading ? "" : `${variants.length} products`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setCatalogOpen(true)} className="btn btn-secondary btn-md">
              <Tags className="w-4 h-4" /> Categories & Brands
            </button>
            <button onClick={() => setImportOpen(true)} className="btn btn-secondary btn-md">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => { setDraft(emptyDraft); setAddOpen(true) }} className="btn btn-primary btn-md">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        }
      />

      {pendingCount > 0 && (
        <Link href="/admin/pending" className="card card-hover p-4 mb-5 flex items-center gap-3 border-amber-200 bg-amber-50/50">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900">{pendingCount} product{pendingCount !== 1 ? "s" : ""} awaiting review</div>
            <div className="text-xs text-slate-500">From imports or rep sales — tap to sort their category & brand.</div>
          </div>
          <span className="badge badge-amber flex-shrink-0">Review →</span>
        </Link>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKU, brand or category…" className="input pl-11" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">{search ? "No matching products" : "No products yet"}</p>
          {!search && <p className="text-xs text-slate-400 mt-1">Add one, or import a spreadsheet</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v, i) => {
            const low = v.currentStock <= v.reorderLevel
            const margin = v.suggestedPrice - v.unitCost
            return (
              <div key={v.id} className="card card-hover p-4 animate-slide-up" style={{ animationDelay: `${Math.min(i, 12) * 15}ms` }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900">{v.name}</span>
                      {!v.isActive && <span className="badge badge-gray">Hidden</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5"><span className="font-mono">{v.sku}</span> · {v.groupName} · {v.brand}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span className="text-slate-500">Sells <strong className="text-slate-900">{formatCurrency(v.suggestedPrice)}</strong></span>
                      <span className="text-slate-400">min {formatCurrency(v.startingPrice)}</span>
                      <span className="text-slate-400">cost {formatCurrency(v.unitCost)}</span>
                      <span className="text-green-600">+{formatCurrency(margin)} margin</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge ${low ? "badge-red" : "badge-green"}`}>{v.currentStock} in stock</span>
                    <div className="text-xs text-slate-400 mt-1">reorder at {v.reorderLevel}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => setRestockTarget(v)} className="btn btn-secondary btn-sm">
                    <PackagePlus className="w-3.5 h-3.5" /> Restock
                  </button>
                  <button onClick={() => setEditTarget(v)} className="btn btn-ghost btn-sm">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(v)} className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add product modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Product"
        description="The SKU is generated automatically from the brand."
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="btn btn-secondary btn-md">Cancel</button>
            <button onClick={addProduct} disabled={saving} className="btn btn-primary btn-md">{saving ? "Saving…" : "Add Product"}</button>
          </>
        }
      >
        <form onSubmit={addProduct} className="space-y-4">
          <div>
            <label className="label">Product name</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. 30W Fast Charger Head" className="input" autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <Combobox value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={categories} placeholder="Choose or type" noun="category" />
            </div>
            <div>
              <label className="label">Brand</label>
              <Combobox value={draft.brand} onChange={(v) => setDraft({ ...draft, brand: v })} options={brands} placeholder="Choose or type" noun="brand" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Unit cost" value={draft.unitCost} onChange={(v) => setDraft({ ...draft, unitCost: v })} />
            <NumField label="Min price" value={draft.startingPrice} onChange={(v) => setDraft({ ...draft, startingPrice: v })} />
            <NumField label="Sell price" value={draft.suggestedPrice} onChange={(v) => setDraft({ ...draft, suggestedPrice: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Opening stock" value={draft.openingStock} onChange={(v) => setDraft({ ...draft, openingStock: v })} />
            <NumField label="Reorder level" value={draft.reorderLevel} onChange={(v) => setDraft({ ...draft, reorderLevel: v })} />
            <div>
              <label className="label">Barcode</label>
              <input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} placeholder="optional" className="input" />
            </div>
          </div>
          <p className="text-xs text-slate-400">A SKU like <span className="font-mono">ORA-001</span> is created automatically from the brand.</p>
        </form>
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { fetchVariants(); fetchLists() }} />
      <CatalogManagerModal open={catalogOpen} onClose={() => setCatalogOpen(false)} onChanged={fetchLists} />
      <EditProductModal target={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchVariants() }} />
      <RestockModal target={restockTarget} onClose={() => setRestockTarget(null)} onSaved={() => { setRestockTarget(null); fetchVariants() }} />

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete product?"
        description={deleteTarget ? `${deleteTarget.name} · ${deleteTarget.sku}` : ""}
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn btn-secondary btn-md">Cancel</button>
            <button onClick={confirmDelete} disabled={deleting} className="btn btn-danger btn-md">{deleting ? "Deleting…" : "Delete"}</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This permanently removes the product from your catalogue. If it already has sales,
          it will be <strong>hidden</strong> instead so your sales history stays intact.
        </p>
      </Modal>
    </div>
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

type ImportRow = Record<string, string>

/** Parse a CSV File into header-keyed rows. */
function parseCsv(input: File | string): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<ImportRow>(input as never, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (err: unknown) => reject(err instanceof Error ? err : new Error("Could not read the CSV")),
    })
  })
}

/**
 * Reads an uploaded spreadsheet into rows. Supports .csv and real .xlsx/.xls.
 * Excel files are validated by their binary signature first (so a non-Excel
 * file renamed to .xlsx is rejected with a clear message instead of crashing),
 * then converted to CSV via SheetJS and parsed with the same code path as CSV.
 */
async function parseSpreadsheet(file: File): Promise<ImportRow[]> {
  const ext = file.name.toLowerCase().split(".").pop() || ""

  if (ext === "csv" || file.type === "text/csv") {
    return parseCsv(file)
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)

    // Verify the file *really* is what its extension claims.
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b // "PK" — .xlsx is a zip
    const isOle =
      bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 // legacy .xls
    if (ext === "xlsx" && !isZip) {
      throw new Error("This isn't a real Excel (.xlsx) file — it looks like it was just renamed. Please upload a genuine Excel file or a CSV.")
    }
    if (ext === "xls" && !isOle) {
      throw new Error("This isn't a real Excel (.xls) file. Please upload a genuine Excel file or a CSV.")
    }

    let csv: string
    try {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(buf, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) throw new Error("no sheets")
      csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
    } catch {
      throw new Error("Couldn't read that Excel file — it may be corrupted or not a spreadsheet. Try re-saving it, or upload a CSV.")
    }

    return parseCsv(csv)
  }

  throw new Error("Unsupported file type. Please upload a .xlsx or .csv file.")
}

function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [importing, setImporting] = useState(false)

  function downloadTemplate() {
    const sample = [
      { name: "Type-C Fast Cable 1m", brand: "Oraimo", category: "Cable", unitCost: 1200, startingPrice: 1800, suggestedPrice: 2200, openingStock: 40, reorderLevel: 10, barcode: "6230001000001" },
      { name: "20W Charger Head", brand: "Samsung", category: "Charger", unitCost: 3500, startingPrice: 4500, suggestedPrice: 5500, openingStock: 25, reorderLevel: 8, barcode: "" },
    ]
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: sample.map((r) => TEMPLATE_HEADERS.map((h) => (r as Record<string, unknown>)[h] ?? "")) })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "product-import-template.csv"
    a.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    setImporting(true)
    try {
      const rows = await parseSpreadsheet(file)
      const clean = rows.filter((r) => Object.values(r).some((v) => (v ?? "").toString().trim()))
      if (clean.length === 0) throw new Error("The file has no data rows")
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      const parts = [`${data.created} added`]
      if (data.pending > 0) parts.push(`${data.pending} need review`)
      if (data.errors?.length) parts.push(`${data.errors.length} skipped`)
      toast.success("Import complete", { description: parts.join(" · ") })
      onDone()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Products" description="Upload an Excel (.xlsx) or CSV file to add many products at once.">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Download className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">1. Download the template</div>
              <div className="text-xs text-slate-500 mt-0.5">Fill in your products following the example rows. Open it in Excel and save as .xlsx, or keep it as CSV — both work.</div>
              <button onClick={downloadTemplate} className="btn btn-secondary btn-sm mt-2.5"><Download className="w-3.5 h-3.5" /> Download template</button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Upload className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">2. Upload your file</div>
              <div className="text-xs text-slate-500 mt-0.5">Excel (.xlsx) or .csv. Rows with a known brand & category are added instantly. Anything unfamiliar waits in <strong>Pending</strong> for you to sort.</div>
              <label className={`btn btn-primary btn-sm mt-2.5 ${importing ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
                {importing ? "Importing…" : (<><Upload className="w-3.5 h-3.5" /> Choose Excel or CSV file</>)}
                <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} className="hidden" disabled={importing} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditProductModal({ target, onClose, onSaved }: { target: ProductVariant | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", brand: "", unitCost: "", startingPrice: "", suggestedPrice: "", reorderLevel: "", isActive: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      setForm({
        name: target.name,
        brand: target.brand,
        unitCost: String(target.unitCost),
        startingPrice: String(target.startingPrice),
        suggestedPrice: String(target.suggestedPrice),
        reorderLevel: String(target.reorderLevel),
        isActive: target.isActive,
      })
    }
  }, [target])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")
      toast.success("Product updated", { description: form.name })
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Edit Product"
      description={target ? `${target.sku} · ${target.groupName}` : ""}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-md">{saving ? "Saving…" : "Save Changes"}</button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Product name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Brand</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Unit cost" value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v })} />
          <NumField label="Min price" value={form.startingPrice} onChange={(v) => setForm({ ...form, startingPrice: v })} />
          <NumField label="Sell price" value={form.suggestedPrice} onChange={(v) => setForm({ ...form, suggestedPrice: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <NumField label="Reorder level" value={form.reorderLevel} onChange={(v) => setForm({ ...form, reorderLevel: v })} />
          <label className="flex items-center gap-2.5 text-sm text-slate-700 pb-2.5 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            Visible in POS search
          </label>
        </div>
      </form>
    </Modal>
  )
}
