import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * DANGER: wipes the entire store — all sales, products, catalogue, staff and
 * settings — returning the app to a clean first-run state (the /setup wizard).
 * Admin-only, and requires an explicit confirmation flag.
 */
export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  if (body?.confirm !== true) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 })
  }

  // Delete in FK-safe order: rows that reference others first.
  await prisma.$transaction([
    prisma.sale.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.stockAdjustment.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productGroup.deleteMany(),
    prisma.pendingProduct.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
    prisma.settings.deleteMany(),
  ])

  return NextResponse.json({ success: true })
}
