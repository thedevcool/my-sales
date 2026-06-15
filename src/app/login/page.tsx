"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "@/components/ui/sonner"
import { useBranding } from "@/components/BrandingProvider"
import { User, Lock, Eye, EyeOff, ArrowRight, TrendingUp, ShieldCheck, Zap, Store } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const branding = useBranding()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // If the store hasn't been set up yet, send the owner to the wizard.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (!d.setupComplete) router.replace("/setup") })
      .catch(() => {})
  }, [router])

  const displayName = branding.businessName || "Your Store"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    })

    if (result?.error) {
      toast.error("Invalid username or password")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/session")
    const session = await res.json()
    const role = session?.user?.role
    toast.success(`Welcome back, ${session?.user?.name || "there"}`)
    router.push(role === "admin" ? "/admin/dashboard" : "/rep/pos")
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(155deg, #312e81 0%, #4f46e5 55%, #6366f1 100%)" }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-lg font-bold">
            {branding.businessName ? branding.mark : <Store className="w-6 h-6" />}
          </div>
          <span className="text-xl font-semibold tracking-tight">{displayName}</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Sell smarter.<br />Track everything.
          </h2>
          <p className="text-indigo-100/80 mt-4 max-w-md">
            {branding.tagline} for {displayName}.
          </p>

          <div className="mt-10 space-y-4 max-w-md">
            <Feature icon={Zap} title="Fast checkout" text="Search, add to cart and complete a sale in seconds." />
            <Feature icon={TrendingUp} title="Live insights" text="See sales, profit and low-stock alerts at a glance." />
            <Feature icon={ShieldCheck} title="Per-rep tracking" text="Every sale is attributed to the staff who made it." />
          </div>
        </div>

        <div className="relative text-sm text-indigo-100/60">© {new Date().getFullYear()} {displayName}</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12 min-h-screen lg:min-h-0"
        style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-lg font-bold"
              style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }}>
              {branding.businessName ? branding.mark : <Store className="w-7 h-7 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{displayName}</h1>
            <p className="text-sm text-slate-500 mt-1">{branding.tagline}</p>
          </div>

          <div className="card p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. favour"
                    className="input pl-10"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            {displayName} · Authorised staff only
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof Zap; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-indigo-100/70">{text}</div>
      </div>
    </div>
  )
}
