import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createVariant } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  return session?.user && role === "admin" ? session : null
}

const num = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const items = await prisma.pendingProduct.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(items)
}

/** Approve a pending product → resolve its category/brand and add it to the catalogue. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "Missing pending id" }, { status: 400 })

  const pendingItem = await prisma.pendingProduct.findUnique({ where: { id } })
  if (!pendingItem) return NextResponse.json({ error: "Pending product not found" }, { status: 404 })

  const name = (body.name || pendingItem.name).toString().trim()
  const categoryName = (body.categoryName || pendingItem.categoryInput || "").toString().trim()
  const brandName = (body.brandName || pendingItem.brandInput || "Generic").toString().trim()
  const unitCost = num(body.unitCost ?? pendingItem.unitCost)
  const startingPrice = num(body.startingPrice ?? pendingItem.startingPrice)
  const suggestedPrice = num(body.suggestedPrice ?? pendingItem.suggestedPrice)
  const openingStock = num(body.openingStock ?? pendingItem.openingStock)
  const reorderLevel = num(body.reorderLevel ?? pendingItem.reorderLevel, 5)
  const barcode = (body.barcode ?? pendingItem.barcode ?? "").toString().trim() || null

  if (!name || !categoryName) {
    return NextResponse.json({ error: "Product name and category are required" }, { status: 400 })
  }
  if (suggestedPrice < startingPrice) {
    return NextResponse.json({ error: "Sell price must be at least the minimum price" }, { status: 400 })
  }

  const variant = await prisma.$transaction(async (tx) => {
    const v = await createVariant(tx, {
      name,
      categoryName,
      brandName,
      unitCost,
      startingPrice,
      suggestedPrice,
      openingStock,
      reorderLevel,
      barcode,
    })
    await tx.pendingProduct.delete({ where: { id } })
    return v
  })

  return NextResponse.json({ id: variant.id, sku: variant.sku })
}

/** Reject (discard) a pending product. */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Missing pending id" }, { status: 400 })
  await prisma.pendingProduct.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
