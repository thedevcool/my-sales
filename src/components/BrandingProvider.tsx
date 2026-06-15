"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { setCurrencySymbol } from "@/lib/utils"
import { brandMark, DEFAULT_BRANDING, type Branding } from "@/lib/settings"

interface BrandingContextValue extends Branding {
  mark: string
}

const BrandingContext = createContext<BrandingContextValue>({
  ...DEFAULT_BRANDING,
  mark: "·",
})

export function BrandingProvider({ value, children }: { value: Branding; children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(value)

  // Format money correctly on the very first paint (no flash from the default).
  setCurrencySymbol(value.currencySymbol)

  // When the server re-renders with fresh settings (e.g. after setup or a
  // Settings save triggers router.refresh()), adopt the new value.
  useEffect(() => {
    setBranding(value)
  }, [value])

  // Reconcile with the live settings from the DB on mount, so the sidebar,
  // logo and title can never get stuck on a stale/cached value.
  useEffect(() => {
    let active = true
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && typeof d.businessName === "string") setBranding(d)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Keep accent + currency in sync with whatever branding is current.
  useEffect(() => {
    document.documentElement.dataset.accent = branding.accentColor
    setCurrencySymbol(branding.currencySymbol)
  }, [branding.accentColor, branding.currencySymbol])

  return (
    <BrandingContext.Provider value={{ ...branding, mark: brandMark(branding.businessName) }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
