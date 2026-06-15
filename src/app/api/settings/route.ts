import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSettings, isValidAccent } from "@/lib/settings"
import { insertSampleProducts } from "@/lib/sampleData"
import { insertStarterCatalog } from "@/lib/catalog"

function slugifyUsername(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "")
}

/** Public — current branding + whether first-run setup is done. */
export async function GET() {
  return NextResponse.json(await getSettings())
}

/** Public, one-time — completes first-run setup: branding + owner account + optional sample data. */
export async function POST(request: Request) {
  const current = await getSettings()
  if (current.setupComplete) {
    return NextResponse.json({ error: "Setup has already been completed" }, { status: 409 })
  }

  const body = await request.json()
  const businessName = (body.businessName || "").trim()
  const tagline = (body.tagline || "").trim() || "Sales & Inventory"
  const currencySymbol = (body.currencySymbol || "").trim() || "₦"
  const accentColor = isValidAccent(body.accentColor) ? body.accentColor : "indigo"
  const ownerName = (body.ownerName || "").trim()
  const ownerUsername = slugifyUsername(body.ownerUsername || ownerName)
  const ownerPassword = body.ownerPassword || ""
  const loadSample = Boolean(body.loadSample)

  if (!businessName) return NextResponse.json({ error: "Business name is required" }, { status: 400 })
  if (!ownerName) return NextResponse.json({ error: "Your name is required" }, { status: 400 })
  if (!ownerUsername) return NextResponse.json({ error: "A valid username is required" }, { status: 400 })
  if (ownerPassword.length < 4) return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })

  const taken = await prisma.user.findUnique({ where: { username: ownerUsername } })
  if (taken) return NextResponse.json({ error: "That username is taken" }, { status: 400 })

  const hashed = await bcrypt.hash(ownerPassword, 12)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.settings.upsert({
        where: { id: "singleton" },
        update: { businessName, tagline, currencySymbol, accentColor, setupComplete: true },
        create: { id: "singleton", businessName, tagline, currencySymbol, accentColor, setupComplete: true },
      })

      await tx.user.create({
        data: { name: ownerName, username: ownerUsername, password: hashed, role: "admin" },
      })

      // Every store starts with selectable categories & brands.
      await insertStarterCatalog(tx)
      if (loadSample) await insertSampleProducts(tx)
    })
  } catch {
    return NextResponse.json({ error: "Setup failed, please try again" }, { status: 500 })
  }

  return NextResponse.json({ success: true, username: ownerUsername })
}

/** Admin — update branding after setup. */
export async function PATCH(request: Request) {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.businessName !== undefined) {
    const name = String(body.businessName).trim()
    if (!name) return NextResponse.json({ error: "Business name cannot be empty" }, { status: 400 })
    data.businessName = name
  }
  if (body.tagline !== undefined) data.tagline = String(body.tagline).trim() || "Sales & Inventory"
  if (body.currencySymbol !== undefined) data.currencySymbol = String(body.currencySymbol).trim() || "₦"
  if (body.accentColor !== undefined && isValidAccent(body.accentColor)) data.accentColor = body.accentColor

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  await prisma.settings.update({ where: { id: "singleton" }, data })
  return NextResponse.json({ success: true })
}
