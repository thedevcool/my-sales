"use client"

import { useState, useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useBranding } from "@/components/BrandingProvider"
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Package,
  ClipboardList,
  Boxes,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Sales Log", href: "/admin/sales-log", icon: ReceiptText },
  { label: "Staff", href: "/admin/sales-reps", icon: Users },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Pending", href: "/admin/pending", icon: ClipboardList, badge: true },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const branding = useBranding()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Refresh the pending badge whenever the route changes (e.g. after a review).
  useEffect(() => {
    fetch("/api/admin/pending")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPendingCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})
  }, [pathname])

  const initials = (session?.user?.name || "A")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  function go(href: string) {
    router.push(href)
    setMobileOpen(false)
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-black/30"
          style={{ background: "var(--brand-gradient)" }}>
          {branding.mark}
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-white text-[0.95rem] truncate">{branding.businessName || "Your Store"}</div>
          <div className="text-[0.7rem] text-slate-400">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className={`nav-link w-full text-left ${active ? "nav-link-active" : ""}`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <span className={`text-[0.7rem] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{session?.user?.name}</div>
            <div className="text-xs text-slate-400">Administrator</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-400 hover:text-white transition-colors p-1.5"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 sticky top-0 h-screen"
        style={{ background: "var(--sidebar)" }}
      >
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 animate-slide-in" style={{ background: "var(--sidebar)" }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-slate-400 hover:text-white p-1.5 z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-icon -ml-2" aria-label="Open menu">
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "var(--brand-gradient)" }}>
                {branding.mark}
              </div>
              <span className="font-semibold text-slate-900 truncate max-w-[9rem]">{branding.businessName || "Your Store"}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">
            {initials}
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
