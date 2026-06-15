"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { PageHeader } from "@/components/PageHeader"
import { Modal } from "@/components/ui/Modal"
import { useBranding } from "@/components/BrandingProvider"
import { toast } from "@/components/ui/sonner"
import { ACCENT_COLORS, CURRENCY_PRESETS, brandMark } from "@/lib/settings"
import { Check, Store, AlertTriangle, Trash2 } from "lucide-react"

const ACCENT_HEX: Record<string, string> = {
  indigo: "#4f46e5", blue: "#2563eb", emerald: "#059669", violet: "#7c3aed",
  rose: "#e11d48", amber: "#d97706", teal: "#0d9488", slate: "#475569",
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const branding = useBranding()

  const [businessName, setBusinessName] = useState("")
  const [tagline, setTagline] = useState("")
  const [currencySymbol, setCurrencySymbol] = useState("₦")
  const [accentColor, setAccentColor] = useState("indigo")
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    setBusinessName(branding.businessName)
    setTagline(branding.tagline)
    setCurrencySymbol(branding.currencySymbol)
    setAccentColor(branding.accentColor)
  }, [branding])

  // Live accent preview
  useEffect(() => {
    document.documentElement.dataset.accent = accentColor
  }, [accentColor])

  async function save() {
    if (!businessName.trim()) {
      toast.error("Business name is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), tagline: tagline.trim(), currencySymbol: currencySymbol.trim(), accentColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save")
      toast.success("Settings saved")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setAccentColor(branding.accentColor)
    document.documentElement.dataset.accent = branding.accentColor
    setBusinessName(branding.businessName)
    setTagline(branding.tagline)
    setCurrencySymbol(branding.currencySymbol)
  }

  const confirmPhrase = (branding.businessName || "RESET").trim()
  const canReset = confirmText.trim().toLowerCase() === confirmPhrase.toLowerCase()

  async function resetStore() {
    if (!canReset) return
    setResetting(true)
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Reset failed")
      }
      toast.success("Store reset — starting over")
      // Clear the session and head to the first-run wizard.
      await signOut({ redirect: false })
      window.location.href = "/setup"
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
      setResetting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader title="Settings" subtitle="Customise how your store looks and works" />

      {/* Live preview */}
      <div className="card p-5 mb-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }}>
          {businessName.trim() ? brandMark(businessName) : <Store className="w-6 h-6" />}
        </div>
        <div>
          <div className="font-bold text-slate-900">{businessName.trim() || "Your Store"}</div>
          <div className="text-xs text-slate-500">{tagline.trim() || "Sales & Inventory"} · prices in {currencySymbol}</div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Business name</label>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="input" placeholder="Sales & Inventory" />
        </div>
        <div>
          <label className="label">Currency symbol</label>
          <div className="flex flex-wrap gap-2">
            {CURRENCY_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setCurrencySymbol(c)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  currencySymbol === c ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}>{c}</button>
            ))}
            <input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} maxLength={4}
              className="w-20 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-center" placeholder="Custom" />
          </div>
        </div>
        <div>
          <label className="label">Accent colour</label>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_COLORS.map((a) => (
              <button key={a} type="button" onClick={() => setAccentColor(a)} aria-label={a}
                className={`w-9 h-9 rounded-full transition-all ${accentColor === a ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"}`}
                style={{ background: ACCENT_HEX[a] }}>
                {accentColor === a && <Check className="w-4 h-4 text-white mx-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={saving} className="btn btn-primary btn-md">{saving ? "Saving…" : "Save changes"}</button>
          <button onClick={reset} disabled={saving} className="btn btn-secondary btn-md">Reset</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Danger zone</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Reset &amp; start over wipes <strong>everything</strong> — sales, products, categories,
              brands, staff and settings — and takes you back to the setup wizard. This cannot be undone.
            </p>
            <button onClick={() => { setConfirmText(""); setResetOpen(true) }} className="btn btn-danger btn-md mt-4">
              <Trash2 className="w-4 h-4" /> Reset &amp; start over
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        title="Reset everything?"
        description="This permanently deletes all data for this store. There is no undo."
        footer={
          <>
            <button onClick={() => setResetOpen(false)} disabled={resetting} className="btn btn-secondary btn-md">Cancel</button>
            <button onClick={resetStore} disabled={!canReset || resetting} className="btn btn-danger btn-md">
              {resetting ? "Resetting…" : "Permanently reset"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            All sales, products, catalogue, staff and branding will be erased and you&apos;ll be signed out.
          </div>
          <div>
            <label className="label">Type <span className="font-mono font-bold">{confirmPhrase}</span> to confirm</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              className="input"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
