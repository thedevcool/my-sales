"use client"

import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useBranding } from "@/components/BrandingProvider"
import { ShoppingBag, History, LogOut } from "lucide-react"

export function RepHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const branding = useBranding()

  const tabs = [
    { label: "Sell", href: "/rep/pos", icon: ShoppingBag },
    { label: "My Sales", href: "/rep/history", icon: History },
  ]

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--brand-gradient)" }}>
            {branding.mark}
          </div>
          <span className="font-semibold text-slate-900 hidden sm:inline truncate max-w-[8rem]">{branding.businessName || "Store"}</span>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href)
            const Icon = t.icon
            return (
              <button
                key={t.href}
                onClick={() => router.push(t.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 hidden sm:inline max-w-[7rem] truncate">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-ghost btn-icon text-slate-400 hover:text-slate-600"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}
