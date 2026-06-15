import type { PrismaClient } from "@prisma/client"
import { uniqueBrandCode, generateSku, brandCode } from "./sku"

type PrismaLike = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/** Categories every new store starts with. The owner can add/remove their own. */
export const STARTER_CATEGORIES = [
  "Cable", "Charger", "Power Bank", "Audio", "Phone Case", "Screen Guard",
  "Adapter", "Car Accessory", "Storage", "Watch Accessory", "Other",
]

/** Brands every new store starts with (code derived automatically). */
export const STARTER_BRANDS = [
  "Oraimo", "itel", "Samsung", "Baseus", "JBL", "SanDisk", "HP", "Generic",
]

/** Seeds the starter categories & brands (idempotent). Safe to call on setup/seed. */
export async function insertStarterCatalog(db: PrismaLike) {
  for (const name of STARTER_CATEGORIES) {
    const exists = await db.category.findUnique({ where: { name } })
    if (!exists) await db.category.create({ data: { name } })
  }
  for (const name of STARTER_BRANDS) {
    const exists = await db.brand.findUnique({ where: { name } })
    if (!exists) await db.brand.create({ data: { name, code: await uniqueBrandCode(db, name) } })
  }
}

/** Case-insensitive lookup of a category by name. */
export async function findCategoryByName(db: PrismaLike, name: string) {
  const all = await db.category.findMany()
  const lower = name.trim().toLowerCase()
  return all.find((c) => c.name.toLowerCase() === lower) || null
}

/** Case-insensitive lookup of a brand by name. */
export async function findBrandByName(db: PrismaLike, name: string) {
  const all = await db.brand.findMany()
  const lower = name.trim().toLowerCase()
  return all.find((b) => b.name.toLowerCase() === lower) || null
}

export async function getOrCreateCategory(db: PrismaLike, name: string) {
  const trimmed = name.trim()
  return (await findCategoryByName(db, trimmed)) || db.category.create({ data: { name: trimmed } })
}

export async function getOrCreateBrand(db: PrismaLike, name: string) {
  const trimmed = name.trim()
  return (
    (await findBrandByName(db, trimmed)) ||
    db.brand.create({ data: { name: trimmed, code: await uniqueBrandCode(db, trimmed) } })
  )
}

export interface CreateVariantInput {
  name: string
  categoryName: string
  brandName: string
  unitCost: number
  startingPrice: number
  suggestedPrice: number
  openingStock: number
  reorderLevel: number
  barcode?: string | null
  sku?: string // optional explicit SKU; otherwise auto-generated from brand
}

/**
 * Creates a catalogue product. Resolves (or creates) the category & brand,
 * auto-generates the SKU from the brand code, and keeps a matching ProductGroup
 * so existing read paths (groupName) keep working.
 */
export async function createVariant(db: PrismaLike, input: CreateVariantInput) {
  const category = await getOrCreateCategory(db, input.categoryName)
  const brand = await getOrCreateBrand(db, input.brandName || "Generic")

  const sku = input.sku?.trim() || (await generateSku(db, brand.code || brandCode(brand.name)))

  let group = await db.productGroup.findFirst({ where: { name: category.name } })
  if (!group) group = await db.productGroup.create({ data: { name: category.name, category: category.name } })

  return db.productVariant.create({
    data: {
      sku,
      name: input.name.trim(),
      category: category.name,
      brand: brand.name,
      unitCost: input.unitCost,
      startingPrice: input.startingPrice,
      suggestedPrice: input.suggestedPrice,
      openingStock: input.openingStock,
      currentStock: input.openingStock,
      reorderLevel: input.reorderLevel,
      barcode: input.barcode || null,
      productGroupId: group.id,
    },
  })
}
