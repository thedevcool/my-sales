"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "@/components/ui/sonner"
import { ACCENT_COLORS, CURRENCY_PRESETS, brandMark } from "@/lib/settings"
import {
  Store, Check, ArrowRight, ArrowLeft, User, Lock, Sparkles, Package, Rocket, Loader2,
} from "lucide-react"

const ACCENT_HEX: Record<string, string> = {
  indigo: "#4f46e5", blue: "#2563eb", emerald: "#059669", violet: "#7c3aed",
  rose: "#e11d48", amber: "#d97706", teal: "#0d9488", slate: "#475569",
}

export default function SetupPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — business
  const [businessName, setBusinessName] = useState("")
  const [tagline, setTagline] = useState("Sales & Inventory")
  const [currencySymbol, setCurrencySymbol] = useState("₦")
  const [accentColor, setAccentColor] = useState("indigo")

  // Step 2 — owner
  const [ownerName, setOwnerName] = useState("")
  const [ownerUsername, setOwnerUsername] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")

  // Step 3 — data
  const [loadSample, setLoadSample] = useState(true)

  // Redirect away if setup is already done
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.setupComplete) router.replace("/login")
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [router])

  // Live accent preview
  useEffect(() => {
    document.documentElement.dataset.accent = accentColor
  }, [accentColor])

  const suggestedUsername = (ownerUsername || ownerName).toLowerCase().replace(/[^a-z0-9]+/g, "")
  const step1Valid = businessName.trim().length > 0
  const step2Valid = ownerName.trim().length > 0 && suggestedUsername.length > 0 && ownerPassword.length >= 4

  async function finish() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          tagline: tagline.trim(),
          currencySymbol: currencySymbol.trim(),
          accentColor,
          ownerName: ownerName.trim(),
          ownerUsername: ownerUsername.trim(),
          ownerPassword,
          loadSample,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Setup failed")

      // Auto sign-in the owner and head to the dashboard.
      const result = await signIn("credentials", {
        username: data.username,
        password: ownerPassword,
        redirect: false,
      })
      toast.success(`Welcome to ${businessName.trim()}! 🎉`)
      if (result?.error) {
        router.push("/login")
      } else {
        router.push("/admin/dashboard")
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed")
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    )
  }

  const steps = [
    { n: 1, label: "Business", icon: Store },
    { n: 2, label: "Your account", icon: User },
    { n: 3, label: "Finish", icon: Rocket },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-lg">
        {/* Brand preview */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
            style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }}>
            {businessName.trim() ? brandMark(businessName) : <Store className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">{businessName.trim() || "Your Store"}</div>
            <div className="text-xs text-slate-500">{tagline.trim() || "Sales & Inventory"}</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === s.n ? "bg-slate-900 text-white" : step > s.n ? "text-green-600" : "text-slate-400"
              }`}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-4 h-px ${step > s.n ? "bg-green-500" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-7 animate-scale-in">
          {step === 1 && (
            <div className="space-y-5">
              <Header icon={Sparkles} title="Let's set up your store" subtitle="This takes less than a minute." />
              <div>
                <label className="label">Business name *</label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Bright Phone Hub" className="input" autoFocus />
              </div>
              <div>
                <label className="label">Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Sales & Inventory" className="input" />
              </div>
              <div>
                <label className="label">Currency symbol</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {CURRENCY_PRESETS.map((c) => (
                    <button key={c} onClick={() => setCurrencySymbol(c)} type="button"
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
                    <button key={a} onClick={() => setAccentColor(a)} type="button" aria-label={a}
                      className={`w-9 h-9 rounded-full transition-all ${accentColor === a ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"}`}
                      style={{ background: ACCENT_HEX[a] }}>
                      {accentColor === a && <Check className="w-4 h-4 text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Header icon={User} title="Create your owner account" subtitle="You'll use this to sign in and manage everything." />
              <div>
                <label className="label">Your full name *</label>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Grace Okafor" className="input" autoFocus />
              </div>
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input value={ownerUsername} onChange={(e) => setOwnerUsername(e.target.value)} placeholder={suggestedUsername || "auto from name"} className="input pl-10" autoCapitalize="none" />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">You'll sign in as {suggestedUsername ? `“${suggestedUsername}”` : "this"}.</p>
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="At least 4 characters" className="input pl-10" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <Header icon={Rocket} title="Almost there!" subtitle="One last choice and you're ready to sell." />
              <button type="button" onClick={() => setLoadSample(!loadSample)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${loadSample ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${loadSample ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">Load a starter catalogue</div>
                    <div className="text-xs text-slate-500 mt-0.5">25 sample phone-accessory products so you can explore right away. You can edit or delete them anytime.</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${loadSample ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}>
                    {loadSample && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              </button>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                <SummaryRow label="Business" value={businessName.trim()} />
                <SummaryRow label="Currency" value={currencySymbol} />
                <SummaryRow label="Sign in as" value={suggestedUsername} />
                <SummaryRow label="Starter products" value={loadSample ? "Yes (25)" : "No — start empty"} />
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-2 mt-7">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="btn btn-secondary btn-lg" disabled={submitting}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                className="btn btn-primary btn-lg flex-1"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={finish} disabled={submitting} className="btn btn-primary btn-lg flex-1">
                {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>) : (<>Finish & launch <Rocket className="w-4 h-4" /></>)}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">You can change any of this later in Settings.</p>
      </div>
    </div>
  )
}

function Header({ icon: Icon, title, subtitle }: { icon: typeof Store; title: string; subtitle: string }) {
  return (
    <div>
      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value || "—"}</span>
    </div>
  )
}
