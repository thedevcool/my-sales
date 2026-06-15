"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
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
  // Set the currency symbol synchronously so the first paint already formats
  // money correctly (no flash from the default ₦).
  setCurrencySymbol(value.currencySymbol)

  useEffect(() => {
    document.documentElement.dataset.accent = value.accentColor
  }, [value.accentColor])

  return (
    <BrandingContext.Provider value={{ ...value, mark: brandMark(value.businessName) }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
