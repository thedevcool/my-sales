import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createVariant, findBrandByName, findCategoryByName } from "@/lib/catalog"

interface ImportRow {
  name?: string
  brand?: string
  category?: string
  unitCost?: string | number
  startingPrice?: string | number
  suggestedPrice?: string | number
  openingStock?: string | number
  reorderLevel?: string | number
  barcode?: string
}

const num = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * Bulk-imports products from a spreadsheet. Rows whose brand AND category both
 * match the store's existing lists are added straight to the catalogue (with an
 * auto-generated SKU). Rows with an unrecognised brand or category are parked in
 * the pending list for the owner to sort out later.
 */
export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : []
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in the file" }, { status: 400 })
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Too many rows (max 1000 at a time)" }, { status: 400 })
  }

  let created = 0
  let pending = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const name = (r.name || "").toString().trim()
    const brandInput = (r.brand || "").toString().trim()
    const categoryInput = (r.category || "").toString().trim()
    const unitCost = num(r.unitCost)
    const startingPrice = num(r.startingPrice)
    const suggestedPrice = num(r.suggestedPrice)
    const openingStock = num(r.openingStock)
    const reorderLevel = num(r.reorderLevel, 5)
    const barcode = (r.barcode || "").toString().trim() || null

    if (!name) {
      errors.push(`Row ${i + 2}: missing product name`)
      continue
    }
    if (suggestedPrice > 0 && suggestedPrice < startingPrice) {
      errors.push(`Row ${i + 2} (${name}): sell price is below the minimum price`)
      continue
    }

    const brand = brandInput ? await findBrandByName(prisma, brandInput) : null
    const category = categoryInput ? await findCategoryByName(prisma, categoryInput) : null

    if (brand && category) {
      await createVariant(prisma, {
        name,
        categoryName: category.name,
        brandName: brand.name,
        unitCost,
        startingPrice,
        suggestedPrice,
        openingStock,
        reorderLevel,
        barcode,
      })
      created++
    } else {
      const unknowns: string[] = []
      if (!category) unknowns.push(categoryInput ? `category “${categoryInput}”` : "missing category")
      if (!brand) unknowns.push(brandInput ? `brand “${brandInput}”` : "missing brand")
      await prisma.pendingProduct.create({
        data: {
          name,
          brandInput: brandInput || null,
          categoryInput: categoryInput || null,
          unitCost,
          startingPrice,
          suggestedPrice,
          openingStock,
          reorderLevel,
          barcode,
          source: "import",
          reason: `Unrecognised ${unknowns.join(" & ")}`,
        },
      })
      pending++
    }
  }

  return NextResponse.json({ created, pending, errors })
}
