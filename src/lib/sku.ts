import type { PrismaClient } from "@prisma/client"

type PrismaLike = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/** Derives a short uppercase SKU prefix from a brand name, e.g. "Oraimo" → "ORA". */
export function brandCode(name: string): string {
  const cleaned = (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return "GEN"
  return cleaned.slice(0, 3).padEnd(3, "X")
}

/** Returns a brand code that isn't already taken by another brand. */
export async function uniqueBrandCode(db: PrismaLike, name: string): Promise<string> {
  const base = brandCode(name)
  let code = base
  let n = 1
  // Codes are capped at 3 chars normally; on collision append digits.
  while (await db.brand.findUnique({ where: { code } })) {
    code = `${base}${n++}`
  }
  return code
}

/**
 * Generates the next sequential SKU for a brand code, e.g. ORA-001, ORA-002…
 * Scans existing variants so numbering survives restarts, and loops until the
 * candidate is actually free (guards against manually-entered SKUs).
 */
export async function generateSku(db: PrismaLike, code: string): Promise<string> {
  const existing = await db.productVariant.findMany({
    where: { sku: { startsWith: `${code}-` } },
    select: { sku: true },
  })
  let max = 0
  for (const { sku } of existing) {
    const n = parseInt(sku.slice(code.length + 1), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  let next = max + 1
  let candidate = `${code}-${String(next).padStart(3, "0")}`
  while (await db.productVariant.findUnique({ where: { sku: candidate } })) {
    next++
    candidate = `${code}-${String(next).padStart(3, "0")}`
  }
  return candidate
}
