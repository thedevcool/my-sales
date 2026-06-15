import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { findCategoryByName } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  return session?.user && role === "admin" ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(categories.map((c) => ({ id: c.id, name: c.name })))
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name } = await request.json()
  const trimmed = (name || "").trim()
  if (!trimmed) return NextResponse.json({ error: "Category name is required" }, { status: 400 })
  if (await findCategoryByName(prisma, trimmed)) {
    return NextResponse.json({ error: "That category already exists" }, { status: 400 })
  }
  const category = await prisma.category.create({ data: { name: trimmed } })
  return NextResponse.json({ id: category.id, name: category.name })
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Missing category id" }, { status: 400 })
  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
