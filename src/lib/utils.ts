import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// White-label currency symbol. Defaults to ₦ and is updated at runtime from the
// store's saved settings (single-tenant deployment).
let currencySymbol = "₦"

export function setCurrencySymbol(symbol: string) {
  if (symbol) currencySymbol = symbol
}

export function getCurrencySymbol(): string {
  return currencySymbol
}

export function formatCurrency(amount: number, symbol: string = currencySymbol): string {
  return `${symbol}${amount.toLocaleString("en-US")}`
}

export function generateReceiptRef(): string {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, "0")
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const y = String(now.getFullYear()).slice(2)
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `POS-${y}${m}${d}-${rand}`
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
