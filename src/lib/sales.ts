import { prisma } from "./prisma"
import { generateReceiptRef } from "./utils"

export interface SaleItemInput {
  variantId?: string
  qty: number
  enteredPrice: number
  discount?: number
  // Off-catalogue ("custom") item a rep typed in because it wasn't listed yet.
  custom?: boolean
  name?: string
  unitCost?: number
}

export interface CreateSaleInput {
  userId: string
  userName?: string
  items: SaleItemInput[]
  paymentMethod: string
  channel?: string
  customer?: string
  note?: string
}

export interface CreateSaleResult {
  receiptRef: string
  total: number
  profit: number
  count: number
}

/**
 * Creates a sale (one or more line items sharing a receipt) in a single
 * transaction. Validates stock and pricing, decrements inventory, and records
 * each line. Throws a descriptive Error if anything is invalid so the caller
 * can surface it to the user immediately.
 */
export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  const { userId, userName, items, paymentMethod, channel, customer, note } = input

  if (!items || items.length === 0) {
    throw new Error("Cannot create a sale with no items")
  }

  const receiptRef = generateReceiptRef()
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const time = now.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return prisma.$transaction(async (tx) => {
    let total = 0
    let profit = 0

    for (const item of items) {
      const qty = Math.floor(Number(item.qty))
      if (!qty || qty < 1) {
        throw new Error("Each item must have a quantity of at least 1")
      }

      // --- Off-catalogue custom item: record the sale and queue it for review ---
      if (item.custom || !item.variantId) {
        const customName = (item.name || "").trim()
        if (!customName) throw new Error("Custom items need a product name")
        const enteredPrice = Math.round(Number(item.enteredPrice))
        if (!Number.isFinite(enteredPrice) || enteredPrice < 0) {
          throw new Error(`Enter a valid price for ${customName}`)
        }
        const discount = Math.max(0, Math.round(Number(item.discount) || 0))
        const unitCost = Math.max(0, Math.round(Number(item.unitCost) || 0))
        const totalAmount = enteredPrice * qty - discount
        const grossProfit = unitCost > 0 ? (enteredPrice - unitCost) * qty - discount : 0

        await tx.sale.create({
          data: {
            date,
            time,
            receiptRef,
            qty,
            enteredPrice,
            startingPrice: 0,
            suggestedPrice: 0,
            discount,
            totalAmount,
            unitCost,
            grossProfit,
            paymentMethod: paymentMethod || "Transfer",
            channel: channel || "In-store",
            customer: customer || null,
            note: note || null,
            customProductName: customName,
            variantId: null,
            userId,
          },
        })

        // Queue the new product for the owner to add to the catalogue.
        await tx.pendingProduct.create({
          data: {
            name: customName,
            unitCost,
            suggestedPrice: enteredPrice,
            startingPrice: 0,
            openingStock: 0,
            reorderLevel: 5,
            source: "staff-sale",
            reason: "Sold by a rep but not in the catalogue",
            qtySold: qty,
            reportedBy: userId,
            reportedByName: userName || null,
          },
        })

        total += totalAmount
        profit += grossProfit
        continue
      }

      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
      })
      if (!variant) throw new Error("One of the products no longer exists")

      if (variant.currentStock < qty) {
        throw new Error(
          `Not enough stock for ${variant.name} — only ${variant.currentStock} left`
        )
      }

      const enteredPrice = Math.round(Number(item.enteredPrice))
      if (!Number.isFinite(enteredPrice) || enteredPrice < variant.startingPrice) {
        throw new Error(
          `Price for ${variant.name} can't be below ₦${variant.startingPrice.toLocaleString()}`
        )
      }

      const discount = Math.max(0, Math.round(Number(item.discount) || 0))
      const lineSubtotal = enteredPrice * qty
      const minTotal = variant.startingPrice * qty
      if (lineSubtotal - discount < minTotal) {
        throw new Error(`Discount on ${variant.name} is too high`)
      }

      const totalAmount = lineSubtotal - discount
      const grossProfit = (enteredPrice - variant.unitCost) * qty - discount

      await tx.sale.create({
        data: {
          date,
          time,
          receiptRef,
          qty,
          enteredPrice,
          startingPrice: variant.startingPrice,
          suggestedPrice: variant.suggestedPrice,
          discount,
          totalAmount,
          unitCost: variant.unitCost,
          grossProfit,
          paymentMethod: paymentMethod || "Transfer",
          channel: channel || "In-store",
          customer: customer || null,
          note: note || null,
          variantId: variant.id,
          userId,
        },
      })

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { currentStock: { decrement: qty } },
      })

      total += totalAmount
      profit += grossProfit
    }

    return { receiptRef, total, profit, count: items.length }
  })
}
