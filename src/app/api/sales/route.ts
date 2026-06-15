import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") || "today"
  const repId = searchParams.get("repId")

  const now = new Date()
  let dateFrom: Date

  if (filter === "today") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (filter === "week") {
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    dateFrom = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate())
  } else if (filter === "month") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    dateFrom = new Date(0)
  }

  const where: Record<string, unknown> = {
    date: { gte: dateFrom },
  }

  const role = (session.user as unknown as Record<string, string>).role
  const isRep = role === "rep"
  if (isRep) {
    where.userId = session.user.id
  } else if (repId) {
    where.userId = repId
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      variant: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 200,
  })

  return NextResponse.json(
    sales.map((s) => {
      const base = {
        id: s.id,
        timestamp: s.timestamp,
        date: s.date,
        receiptRef: s.receiptRef,
        productName: s.variant?.name ?? s.customProductName ?? "Custom item",
        staffName: s.user.name,
        qty: s.qty,
        enteredPrice: s.enteredPrice,
        startingPrice: s.startingPrice,
        suggestedPrice: s.suggestedPrice,
        discount: s.discount,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        channel: s.channel,
        customer: s.customer,
        note: s.note,
      }
      // Cost & profit are admin-only — never sent to a rep.
      return isRep ? base : { ...base, unitCost: s.unitCost, grossProfit: s.grossProfit }
    })
  )
}
