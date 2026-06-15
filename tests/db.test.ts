import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// These integration tests run against whatever store is in the dev database.
// The app is white-label, so they assert invariants that must hold for ANY
// configured store rather than the specifics of the demo seed.
describe("Database Integration", () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("has an admin user with a login", async () => {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } })
    expect(admin).not.toBeNull()
    expect(admin?.role).toBe("admin")
    expect((admin?.username || "").length).toBeGreaterThan(0)
  })

  it("gives every user a unique username", async () => {
    const users = await prisma.user.findMany({ select: { username: true } })
    expect(users.length).toBeGreaterThanOrEqual(1)
    const usernames = users.map((u) => u.username)
    expect(new Set(usernames).size).toBe(usernames.length)
  })

  it("has product groups that each contain variants", async () => {
    const groups = await prisma.productGroup.findMany({ include: { variants: true } })
    for (const group of groups) {
      expect(group.variants.length).toBeGreaterThan(0)
    }
  })

  it("gives every product variant a unique SKU", async () => {
    const variants = await prisma.productVariant.findMany({ select: { sku: true } })
    const skus = variants.map((v) => v.sku)
    expect(new Set(skus).size).toBe(skus.length)
    for (const sku of skus) expect(sku.length).toBeGreaterThan(0)
  })

  it("never prices a product below its minimum", async () => {
    const variants = await prisma.productVariant.findMany({
      select: { startingPrice: true, suggestedPrice: true },
    })
    for (const v of variants) {
      expect(v.startingPrice).toBeLessThanOrEqual(v.suggestedPrice)
    }
  })

  it("gives every brand a unique SKU code", async () => {
    const brands = await prisma.brand.findMany({ select: { code: true, name: true } })
    const codes = brands.map((b) => b.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const b of brands) expect(b.code.length).toBeGreaterThan(0)
  })
})
