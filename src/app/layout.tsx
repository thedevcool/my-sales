import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { BrandingProvider } from "@/components/BrandingProvider"
import { Toaster } from "@/components/ui/sonner"
import { getSettings } from "@/lib/settings"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const name = s.businessName || "Sales & Inventory"
  return {
    title: s.businessName ? `${s.businessName} · ${s.tagline}` : "Set up your store",
    description: `${name} — point of sale & inventory`,
    manifest: "/manifest.json",
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  return (
    <html lang="en" data-accent={settings.accentColor} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <BrandingProvider value={settings}>
          <SessionProvider>{children}</SessionProvider>
        </BrandingProvider>
        <Toaster />
      </body>
    </html>
  )
}
