import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { findBrandByName } from "@/lib/catalog"
import { uniqueBrandCode } from "@/lib/sku"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  return session?.user && role === "admin" ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(brands.map((b) => ({ id: b.id, name: b.name, code: b.code })))
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name } = await request.json()
  const trimmed = (name || "").trim()
  if (!trimmed) return NextResponse.json({ error: "Brand name is required" }, { status: 400 })
  if (await findBrandByName(prisma, trimmed)) {
    return NextResponse.json({ error: "That brand already exists" }, { status: 400 })
  }
  const code = await uniqueBrandCode(prisma, trimmed)
  const brand = await prisma.brand.create({ data: { name: trimmed, code } })
  return NextResponse.json({ id: brand.id, name: brand.name, code: brand.code })
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Missing brand id" }, { status: 400 })
  await prisma.brand.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
