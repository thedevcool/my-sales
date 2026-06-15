import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || ""

  if (!q || q.length < 1) {
    return NextResponse.json([])
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { sku: { contains: q.toUpperCase() } },
        { barcode: { contains: q } },
        { productGroup: { name: { contains: q } } },
      ],
    },
    include: {
      productGroup: true,
    },
    take: 20,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(variants)
}
