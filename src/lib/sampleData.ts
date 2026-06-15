import type { PrismaClient } from "@prisma/client"
import { getOrCreateCategory, getOrCreateBrand, insertStarterCatalog } from "./catalog"

/**
 * Optional starter catalogue. The owner can choose to load this during first-run
 * setup, or start with an empty catalogue and add their own products.
 */
export const SAMPLE_PRODUCTS = [
  { group: "Cable", category: "Cable", variants: [
    { sku: "FDT001", name: "Type-C Fast Cable 1m", brand: "Oraimo", cost: 1200, starting: 1800, suggested: 2200, stock: 45, reorder: 12, barcode: "6230001000001" },
    { sku: "FDT002", name: "Lightning Cable 1m", brand: "Oraimo", cost: 1500, starting: 2200, suggested: 2800, stock: 38, reorder: 10, barcode: "6230001000002" },
    { sku: "FDT003", name: "USB-C to C Cable 2m", brand: "itel", cost: 1800, starting: 2600, suggested: 3200, stock: 24, reorder: 8, barcode: "6230001000003" },
    { sku: "FDT019", name: "3-in-1 Charging Cable", brand: "Oraimo", cost: 2500, starting: 3500, suggested: 4200, stock: 15, reorder: 5, barcode: "6230001000019" },
  ]},
  { group: "Charger", category: "Charger", variants: [
    { sku: "FDT004", name: "20W Fast Charger Head", brand: "Oraimo", cost: 3500, starting: 4500, suggested: 5500, stock: 30, reorder: 8, barcode: "6230001000004" },
    { sku: "FDT005", name: "25W Samsung Charger Head", brand: "Samsung", cost: 4800, starting: 6000, suggested: 7200, stock: 18, reorder: 6, barcode: "6230001000005" },
  ]},
  { group: "Car Accessory", category: "Car Accessory", variants: [
    { sku: "FDT006", name: "Dual Port Car Charger", brand: "Baseus", cost: 3000, starting: 4000, suggested: 4800, stock: 16, reorder: 5, barcode: "6230001000006" },
    { sku: "FDT021", name: "Phone Holder Car Mount", brand: "Generic", cost: 2500, starting: 3500, suggested: 4500, stock: 12, reorder: 4, barcode: "6230001000021" },
  ]},
  { group: "Power Bank", category: "Power Bank", variants: [
    { sku: "FDT007", name: "Power Bank 10000mAh", brand: "itel", cost: 8500, starting: 10000, suggested: 12500, stock: 22, reorder: 6, barcode: "6230001000007" },
    { sku: "FDT008", name: "Power Bank 20000mAh", brand: "Oraimo", cost: 12000, starting: 15000, suggested: 17500, stock: 12, reorder: 4, barcode: "6230001000008" },
  ]},
  { group: "Audio", category: "Audio", variants: [
    { sku: "FDT009", name: "Wireless Earbuds", brand: "Oraimo", cost: 8500, starting: 11000, suggested: 14000, stock: 20, reorder: 5, barcode: "6230001000009" },
    { sku: "FDT010", name: "Bluetooth Neckband", brand: "Oraimo", cost: 5000, starting: 6500, suggested: 8500, stock: 14, reorder: 4, barcode: "6230001000010" },
    { sku: "FDT011", name: "Wired Earphones", brand: "itel", cost: 1200, starting: 1800, suggested: 2200, stock: 40, reorder: 12, barcode: "6230001000011" },
    { sku: "FDT012", name: "Bluetooth Speaker Mini", brand: "JBL", cost: 9500, starting: 12000, suggested: 14500, stock: 10, reorder: 3, barcode: "6230001000012" },
  ]},
  { group: "Phone Case", category: "Phone Case", variants: [
    { sku: "FDT013", name: "iPhone 13 Case", brand: "Generic", cost: 1200, starting: 2000, suggested: 2500, stock: 35, reorder: 10, barcode: "6230001000013" },
    { sku: "FDT014", name: "Samsung A15 Case", brand: "Generic", cost: 1000, starting: 1800, suggested: 2200, stock: 28, reorder: 8, barcode: "6230001000014" },
    { sku: "FDT015", name: "Tecno Spark 20 Case", brand: "Generic", cost: 900, starting: 1600, suggested: 2000, stock: 26, reorder: 8, barcode: "6230001000015" },
    { sku: "FDT016", name: "Infinix Hot 40 Case", brand: "Generic", cost: 900, starting: 1600, suggested: 2000, stock: 25, reorder: 8, barcode: "6230001000016" },
  ]},
  { group: "Screen Guard", category: "Screen Guard", variants: [
    { sku: "FDT017", name: "Screen Protector 6.5 inch", brand: "Generic", cost: 500, starting: 1000, suggested: 1200, stock: 80, reorder: 20, barcode: "6230001000017" },
    { sku: "FDT018", name: "iPhone 13 Screen Protector", brand: "Generic", cost: 800, starting: 1400, suggested: 1800, stock: 40, reorder: 12, barcode: "6230001000018" },
  ]},
  { group: "Adapter", category: "Adapter", variants: [
    { sku: "FDT020", name: "OTG Type-C Adapter", brand: "Baseus", cost: 1300, starting: 2000, suggested: 2500, stock: 22, reorder: 6, barcode: "6230001000020" },
  ]},
  { group: "Content Accessory", category: "Content Accessory", variants: [
    { sku: "FDT022", name: "Ring Light Clip", brand: "Generic", cost: 2200, starting: 3200, suggested: 4000, stock: 14, reorder: 4, barcode: "6230001000022" },
  ]},
  { group: "Storage", category: "Storage", variants: [
    { sku: "FDT023", name: "Memory Card 64GB", brand: "SanDisk", cost: 6000, starting: 7000, suggested: 8500, stock: 18, reorder: 5, barcode: "6230001000023" },
  ]},
  { group: "Watch Accessory", category: "Watch Accessory", variants: [
    { sku: "FDT024", name: "Smart Watch Strap 42mm", brand: "Generic", cost: 1800, starting: 2500, suggested: 3200, stock: 16, reorder: 5, barcode: "6230001000024" },
  ]},
  { group: "Laptop Accessory", category: "Laptop Accessory", variants: [
    { sku: "FDT025", name: "Laptop Charger 65W", brand: "HP", cost: 12000, starting: 15000, suggested: 17500, stock: 8, reorder: 2, barcode: "6230001000025" },
  ]},
]

type PrismaLike = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/** Inserts the sample catalogue, skipping any SKUs that already exist. */
export async function insertSampleProducts(db: PrismaLike) {
  // Make sure starter categories & brands exist as selectable records first.
  await insertStarterCatalog(db)

  for (const group of SAMPLE_PRODUCTS) {
    let productGroup = await db.productGroup.findFirst({ where: { name: group.group } })
    if (!productGroup) {
      productGroup = await db.productGroup.create({ data: { name: group.group, category: group.category } })
    }
    await getOrCreateCategory(db, group.category)
    for (const v of group.variants) {
      await getOrCreateBrand(db, v.brand)
      const existing = await db.productVariant.findUnique({ where: { sku: v.sku } })
      if (existing) continue
      await db.productVariant.create({
        data: {
          sku: v.sku,
          name: v.name,
          category: group.category,
          brand: v.brand,
          unitCost: v.cost,
          startingPrice: v.starting,
          suggestedPrice: v.suggested,
          openingStock: v.stock,
          currentStock: v.stock,
          reorderLevel: v.reorder,
          barcode: v.barcode,
          productGroupId: productGroup.id,
        },
      })
    }
  }
}
