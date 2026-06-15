import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim()

  // With a query: case-insensitive match on name/sku/barcode/category.
  // Without a query: return the full active catalogue so reps can browse.
  const where: Prisma.ProductVariantWhereInput = q
    ? {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q } },
          { productGroup: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : { isActive: true }

  const variants = await prisma.productVariant.findMany({
    where,
    include: { productGroup: true },
    take: q ? 30 : 1000,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(variants)
}
