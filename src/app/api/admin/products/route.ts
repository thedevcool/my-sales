import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createVariant } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user || role !== "admin") return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const variants = await prisma.productVariant.findMany({
    include: { productGroup: { select: { name: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(
    variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      category: v.category,
      brand: v.brand,
      unitCost: v.unitCost,
      startingPrice: v.startingPrice,
      suggestedPrice: v.suggestedPrice,
      currentStock: v.currentStock,
      reorderLevel: v.reorderLevel,
      barcode: v.barcode,
      isActive: v.isActive,
      groupName: v.productGroup.name,
    }))
  )
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name || "").trim()
  // Category & brand are chosen by name; unknown ones are created on the spot.
  const categoryName = (body.category || body.group || "").trim()
  const brandName = (body.brand || "Generic").trim()
  const unitCost = Math.max(0, Math.round(Number(body.unitCost) || 0))
  const startingPrice = Math.max(0, Math.round(Number(body.startingPrice) || 0))
  const suggestedPrice = Math.max(0, Math.round(Number(body.suggestedPrice) || 0))
  const openingStock = Math.max(0, Math.round(Number(body.openingStock) || 0))
  const reorderLevel = Math.max(0, Math.round(Number(body.reorderLevel) || 5))
  const barcode = (body.barcode || "").trim() || null

  if (!name || !categoryName) {
    return NextResponse.json({ error: "Product name and category are required" }, { status: 400 })
  }
  if (suggestedPrice < startingPrice) {
    return NextResponse.json({ error: "Sell price must be at least the minimum price" }, { status: 400 })
  }

  // The SKU is generated automatically from the brand code (e.g. ORA-001).
  const variant = await createVariant(prisma, {
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

  return NextResponse.json({ id: variant.id, sku: variant.sku })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.brand !== undefined) data.brand = String(body.brand).trim()
  if (body.unitCost !== undefined) data.unitCost = Math.max(0, Math.round(Number(body.unitCost) || 0))
  if (body.startingPrice !== undefined) data.startingPrice = Math.max(0, Math.round(Number(body.startingPrice) || 0))
  if (body.suggestedPrice !== undefined) data.suggestedPrice = Math.max(0, Math.round(Number(body.suggestedPrice) || 0))
  if (body.reorderLevel !== undefined) data.reorderLevel = Math.max(0, Math.round(Number(body.reorderLevel) || 0))
  if (body.barcode !== undefined) data.barcode = String(body.barcode).trim() || null
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

  const start = data.startingPrice as number | undefined
  const suggested = data.suggestedPrice as number | undefined
  if (start !== undefined && suggested !== undefined && suggested < start) {
    return NextResponse.json({ error: "Suggested price must be at least the starting price" }, { status: 400 })
  }

  await prisma.productVariant.update({ where: { id }, data })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

  // A product with sales can't be removed without destroying financial history,
  // so it's hidden instead. Products with no sales are deleted outright (along
  // with their stock-movement records).
  const saleCount = await prisma.sale.count({ where: { variantId: id } })
  if (saleCount > 0) {
    await prisma.productVariant.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ softDeleted: true })
  }

  await prisma.$transaction([
    prisma.stockAdjustment.deleteMany({ where: { variantId: id } }),
    prisma.purchase.deleteMany({ where: { variantId: id } }),
    prisma.productVariant.delete({ where: { id } }),
  ])
  return NextResponse.json({ deleted: true })
}
