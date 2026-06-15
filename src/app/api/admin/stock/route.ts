import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Records a stock movement (restock or manual correction) and updates the
 * variant's current stock in a single transaction, keeping an audit trail in
 * the StockAdjustment table.
 */
export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as unknown as Record<string, string> | undefined)?.role
  if (!session?.user?.id || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const variantId = body.variantId as string
  const qty = Math.round(Number(body.qty))
  const reason = (body.reason || "Restock").toString().trim()
  const note = (body.note || "").toString().trim() || null

  if (!variantId || !Number.isFinite(qty) || qty === 0) {
    return NextResponse.json({ error: "A non-zero quantity is required" }, { status: 400 })
  }

  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const time = now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) throw new Error("Product not found")
      if (variant.currentStock + qty < 0) {
        throw new Error("Adjustment would make stock negative")
      }

      await tx.stockAdjustment.create({
        data: { date, time, reason, qty, note, variantId, userId: session.user!.id },
      })

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { currentStock: { increment: qty } },
      })

      return updated.currentStock
    })

    return NextResponse.json({ currentStock: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
