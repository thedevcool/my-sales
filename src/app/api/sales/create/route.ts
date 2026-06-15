import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSale } from "@/lib/sales"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { items, paymentMethod, channel, customer, note } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items in the sale" }, { status: 400 })
  }

  for (const item of items) {
    const isCustom = item.custom || !item.variantId
    if (!isCustom && !item.variantId) {
      return NextResponse.json({ error: "Each item needs a product" }, { status: 400 })
    }
    if (isCustom && !(item.name || "").trim()) {
      return NextResponse.json({ error: "Custom items need a product name" }, { status: 400 })
    }
    if (item.enteredPrice === undefined || item.enteredPrice < 0) {
      return NextResponse.json({ error: "Each item needs a valid price" }, { status: 400 })
    }
    if (item.discount < 0) {
      return NextResponse.json({ error: "Discount cannot be negative" }, { status: 400 })
    }
  }

  try {
    const result = await createSale({
      userId: session.user.id,
      userName: session.user.name || undefined,
      items: items.map((i) => ({
        variantId: i.variantId,
        qty: i.qty,
        enteredPrice: i.enteredPrice,
        discount: i.discount || 0,
        custom: i.custom || !i.variantId,
        name: i.name,
        unitCost: i.unitCost,
      })),
      paymentMethod: paymentMethod || "Transfer",
      channel: channel || "In-store",
      customer: customer || undefined,
      note: note || undefined,
    })

    return NextResponse.json({
      receiptRef: result.receiptRef,
      total: result.total,
      profit: result.profit,
      message: "Sale recorded",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sale failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
