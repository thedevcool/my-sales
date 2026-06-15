import type { PrismaClient } from "@prisma/client"
import { insertStarterCatalog, createVariant } from "./catalog"

/**
 * Optional starter catalogue. The owner can choose to load this during first-run
 * setup, or start with an empty catalogue and add their own products. SKUs are
 * generated automatically from each brand (e.g. ORA-001) when loaded.
 */
export const SAMPLE_PRODUCTS = [
  { category: "Cable", variants: [
    { name: "Type-C Fast Cable 1m", brand: "Oraimo", cost: 1200, starting: 1800, suggested: 2200, stock: 45, reorder: 12, barcode: "6230001000001" },
    { name: "Lightning Cable 1m", brand: "Oraimo", cost: 1500, starting: 2200, suggested: 2800, stock: 38, reorder: 10, barcode: "6230001000002" },
    { name: "USB-C to C Cable 2m", brand: "itel", cost: 1800, starting: 2600, suggested: 3200, stock: 24, reorder: 8, barcode: "6230001000003" },
    { name: "3-in-1 Charging Cable", brand: "Oraimo", cost: 2500, starting: 3500, suggested: 4200, stock: 15, reorder: 5, barcode: "6230001000019" },
  ]},
  { category: "Charger", variants: [
    { name: "20W Fast Charger Head", brand: "Oraimo", cost: 3500, starting: 4500, suggested: 5500, stock: 30, reorder: 8, barcode: "6230001000004" },
    { name: "25W Samsung Charger Head", brand: "Samsung", cost: 4800, starting: 6000, suggested: 7200, stock: 18, reorder: 6, barcode: "6230001000005" },
  ]},
  { category: "Car Accessory", variants: [
    { name: "Dual Port Car Charger", brand: "Baseus", cost: 3000, starting: 4000, suggested: 4800, stock: 16, reorder: 5, barcode: "6230001000006" },
    { name: "Phone Holder Car Mount", brand: "Generic", cost: 2500, starting: 3500, suggested: 4500, stock: 12, reorder: 4, barcode: "6230001000021" },
  ]},
  { category: "Power Bank", variants: [
    { name: "Power Bank 10000mAh", brand: "itel", cost: 8500, starting: 10000, suggested: 12500, stock: 22, reorder: 6, barcode: "6230001000007" },
    { name: "Power Bank 20000mAh", brand: "Oraimo", cost: 12000, starting: 15000, suggested: 17500, stock: 12, reorder: 4, barcode: "6230001000008" },
  ]},
  { category: "Audio", variants: [
    { name: "Wireless Earbuds", brand: "Oraimo", cost: 8500, starting: 11000, suggested: 14000, stock: 20, reorder: 5, barcode: "6230001000009" },
    { name: "Bluetooth Neckband", brand: "Oraimo", cost: 5000, starting: 6500, suggested: 8500, stock: 14, reorder: 4, barcode: "6230001000010" },
    { name: "Wired Earphones", brand: "itel", cost: 1200, starting: 1800, suggested: 2200, stock: 40, reorder: 12, barcode: "6230001000011" },
    { name: "Bluetooth Speaker Mini", brand: "JBL", cost: 9500, starting: 12000, suggested: 14500, stock: 10, reorder: 3, barcode: "6230001000012" },
  ]},
  { category: "Phone Case", variants: [
    { name: "iPhone 13 Case", brand: "Generic", cost: 1200, starting: 2000, suggested: 2500, stock: 35, reorder: 10, barcode: "6230001000013" },
    { name: "Samsung A15 Case", brand: "Generic", cost: 1000, starting: 1800, suggested: 2200, stock: 28, reorder: 8, barcode: "6230001000014" },
    { name: "Tecno Spark 20 Case", brand: "Generic", cost: 900, starting: 1600, suggested: 2000, stock: 26, reorder: 8, barcode: "6230001000015" },
    { name: "Infinix Hot 40 Case", brand: "Generic", cost: 900, starting: 1600, suggested: 2000, stock: 25, reorder: 8, barcode: "6230001000016" },
  ]},
  { category: "Screen Guard", variants: [
    { name: "Screen Protector 6.5 inch", brand: "Generic", cost: 500, starting: 1000, suggested: 1200, stock: 80, reorder: 20, barcode: "6230001000017" },
    { name: "iPhone 13 Screen Protector", brand: "Generic", cost: 800, starting: 1400, suggested: 1800, stock: 40, reorder: 12, barcode: "6230001000018" },
  ]},
  { category: "Adapter", variants: [
    { name: "OTG Type-C Adapter", brand: "Baseus", cost: 1300, starting: 2000, suggested: 2500, stock: 22, reorder: 6, barcode: "6230001000020" },
  ]},
  { category: "Content Accessory", variants: [
    { name: "Ring Light Clip", brand: "Generic", cost: 2200, starting: 3200, suggested: 4000, stock: 14, reorder: 4, barcode: "6230001000022" },
  ]},
  { category: "Storage", variants: [
    { name: "Memory Card 64GB", brand: "SanDisk", cost: 6000, starting: 7000, suggested: 8500, stock: 18, reorder: 5, barcode: "6230001000023" },
  ]},
  { category: "Watch Accessory", variants: [
    { name: "Smart Watch Strap 42mm", brand: "Generic", cost: 1800, starting: 2500, suggested: 3200, stock: 16, reorder: 5, barcode: "6230001000024" },
  ]},
  { category: "Laptop Accessory", variants: [
    { name: "Laptop Charger 65W", brand: "HP", cost: 12000, starting: 15000, suggested: 17500, stock: 8, reorder: 2, barcode: "6230001000025" },
  ]},
]

type PrismaLike = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/**
 * Inserts the sample catalogue. Categories & brands are registered as selectable
 * records and each product gets an auto-generated, brand-based SKU. Existing
 * products (matched by name) are skipped so it's safe to run more than once.
 */
export async function insertSampleProducts(db: PrismaLike) {
  await insertStarterCatalog(db)

  for (const group of SAMPLE_PRODUCTS) {
    for (const v of group.variants) {
      const existing = await db.productVariant.findFirst({ where: { name: v.name } })
      if (existing) continue
      await createVariant(db, {
        name: v.name,
        categoryName: group.category,
        brandName: v.brand,
        unitCost: v.cost,
        startingPrice: v.starting,
        suggestedPrice: v.suggested,
        openingStock: v.stock,
        reorderLevel: v.reorder,
        barcode: v.barcode,
      })
    }
  }
}
