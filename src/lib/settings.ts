import { prisma } from "./prisma"

export interface Branding {
  businessName: string
  tagline: string
  currencySymbol: string
  accentColor: string
  setupComplete: boolean
}

export const DEFAULT_BRANDING: Branding = {
  businessName: "",
  tagline: "Sales & Inventory",
  currencySymbol: "₦",
  accentColor: "indigo",
  setupComplete: false,
}

/** Accent presets offered in the setup wizard. */
export const ACCENT_COLORS = ["indigo", "blue", "emerald", "violet", "rose", "amber", "teal", "slate"] as const
export type AccentColor = (typeof ACCENT_COLORS)[number]

/** Currency presets offered in the setup wizard (owner can also type their own). */
export const CURRENCY_PRESETS = ["₦", "$", "£", "€", "₵", "₹", "R", "KSh"]

export function isValidAccent(value: unknown): value is AccentColor {
  return typeof value === "string" && (ACCENT_COLORS as readonly string[]).includes(value)
}

/** Reads the singleton settings row, falling back to defaults when unconfigured. */
export async function getSettings(): Promise<Branding> {
  try {
    const s = await prisma.settings.findUnique({ where: { id: "singleton" } })
    if (!s) return DEFAULT_BRANDING
    return {
      businessName: s.businessName,
      tagline: s.tagline,
      currencySymbol: s.currencySymbol,
      accentColor: s.accentColor,
      setupComplete: s.setupComplete,
    }
  } catch {
    // Database not migrated yet — treat as unconfigured.
    return DEFAULT_BRANDING
  }
}

/** Initials shown in the logo badge, derived from the business name. */
export function brandMark(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return "·"
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
