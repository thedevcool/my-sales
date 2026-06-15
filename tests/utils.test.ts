import { describe, it, expect } from "vitest"
import { formatCurrency, generateReceiptRef, formatDate } from "../src/lib/utils"

describe("formatCurrency", () => {
  it("formats number with ₦ symbol and commas", () => {
    expect(formatCurrency(0)).toBe("₦0")
    expect(formatCurrency(1000)).toBe("₦1,000")
    expect(formatCurrency(1234567)).toBe("₦1,234,567")
    expect(formatCurrency(50000)).toBe("₦50,000")
  })
})

describe("generateReceiptRef", () => {
  it("generates a receipt reference in correct format", () => {
    expect(generateReceiptRef()).toMatch(/^POS-\d{6}-\d{4}$/)
  })

  it("generates unique references", () => {
    const refs = new Set(Array.from({ length: 100 }, () => generateReceiptRef()))
    expect(refs.size).toBeGreaterThan(90)
  })
})

describe("formatDate", () => {
  it("formats a date correctly", () => {
    const formatted = formatDate(new Date(2026, 5, 13))
    expect(formatted).toContain("2026")
    expect(formatted).toContain("Jun")
    expect(formatted).toContain("13")
  })
})
