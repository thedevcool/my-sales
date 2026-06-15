import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get("range") || "week"

  const now = new Date()
  let dateFrom: Date
  if (range === "today") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (range === "week") {
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    dateFrom = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate())
  } else if (range === "month") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    dateFrom = new Date(0)
  }

  const [salesAgg, variants, lowStock] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: dateFrom } },
      _sum: { totalAmount: true, grossProfit: true },
      _count: true,
    }),
    prisma.productVariant.aggregate({ _sum: { currentStock: true } }),
    prisma.productVariant.findMany({
      where: { currentStock: { lte: prisma.productVariant.fields.reorderLevel }, isActive: true },
      orderBy: { currentStock: "asc" },
      take: 10,
    }),
  ])

  const topProducts = await prisma.sale.groupBy({
    by: ["variantId"],
    where: { date: { gte: dateFrom }, variantId: { not: null } },
    _sum: { qty: true, totalAmount: true },
    orderBy: { _sum: { qty: "desc" } },
    take: 10,
  })

  const variantIds = topProducts.map((t) => t.variantId).filter((id): id is string => !!id)
  const variantsMap = variantIds.length > 0
    ? await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } })
    : []
  const nameMap = new Map(variantsMap.map((v) => [v.id, v.name]))

  // Sales trend for the last 7 days (independent of the selected KPI range).
  const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  const trendSales = await prisma.sale.findMany({
    where: { date: { gte: trendStart } },
    select: { date: true, totalAmount: true },
  })
  const trendMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(trendStart)
    d.setDate(trendStart.getDate() + i)
    trendMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const s of trendSales) {
    const key = new Date(s.date).toISOString().slice(0, 10)
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + s.totalAmount)
  }
  const weeklyTrend = Array.from(trendMap.entries()).map(([day, amount]) => ({
    label: new Date(day).toLocaleDateString("en-NG", { weekday: "short" }),
    day,
    amount,
  }))

  // Payment-method split for the selected range.
  const paymentGroups = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { date: { gte: dateFrom } },
    _sum: { totalAmount: true },
  })
  const paymentBreakdown = paymentGroups.map((p) => ({
    method: p.paymentMethod,
    amount: p._sum.totalAmount || 0,
  }))

  return NextResponse.json({
    weeklyTrend,
    paymentBreakdown,
    totalSales: salesAgg._sum.totalAmount || 0,
    totalProfit: salesAgg._sum.grossProfit || 0,
    totalTransactions: salesAgg._count,
    totalStock: variants._sum.currentStock || 0,
    lowStockCount: lowStock.length,
    topProducts: topProducts.map((t) => ({
      name: nameMap.get(t.variantId ?? "") || "Unknown",
      qty: t._sum.qty || 0,
      amount: t._sum.totalAmount || 0,
    })),
    lowStockItems: lowStock.map((v) => ({
      sku: v.sku,
      name: v.name,
      currentStock: v.currentStock,
      reorderLevel: v.reorderLevel,
    })),
  })
}
