"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/Modal"
import { toast } from "@/components/ui/sonner"

export interface RestockTarget {
  id: string
  name: string
  currentStock: number
}

export function RestockModal({
  target,
  onClose,
  onSaved,
}: {
  target: RestockTarget | null
  onClose: () => void
  onSaved: (newStock: number) => void
}) {
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState("Restock")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      setQty("")
      setReason("Restock")
      setNote("")
    }
  }, [target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    const amount = Number(qty)
    if (!amount) {
      toast.error("Enter a quantity")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: target.id, qty: amount, reason, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Adjustment failed")
      toast.success("Stock updated", { description: `${target.name} → ${data.currentStock} in stock` })
      onSaved(data.currentStock)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed")
    } finally {
      setSaving(false)
    }
  }

  const preview = target ? target.currentStock + (Number(qty) || 0) : 0

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Adjust Stock"
      description={target ? `${target.name} · currently ${target.currentStock} in stock` : ""}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary btn-md">{saving ? "Saving…" : "Apply"}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Quantity (use a negative number to remove stock)</label>
          <input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 20" className="input" autoFocus />
          {qty !== "" && (
            <p className="text-xs text-slate-500 mt-1.5">
              New stock level: <strong className={preview < 0 ? "text-red-500" : "text-slate-900"}>{preview}</strong>
            </p>
          )}
        </div>
        <div>
          <label className="label">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="select">
            <option>Restock</option>
            <option>Stock count correction</option>
            <option>Damaged / lost</option>
            <option>Return</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, reference, etc." className="input" />
        </div>
      </form>
    </Modal>
  )
}
