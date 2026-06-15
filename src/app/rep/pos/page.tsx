"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/sonner"
import { RepHeader } from "@/components/RepHeader"
import { Modal } from "@/components/ui/Modal"
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  PackageSearch,
  PackagePlus,
  Banknote,
  User,
} from "lucide-react"

interface CartItem {
  variantId: string
  sku: string
  name: string
  category: string
  startingPrice: number
  suggestedPrice: number
  enteredPrice: number
  qty: number
  discount: number
  lineTotal: number
  stock: number
  custom?: boolean
  unitCost?: number
}

interface ProductHit {
  id: string
  sku: string
  name: string
  category: string
  brand: string
  startingPrice: number
  suggestedPrice: number
  currentStock: number
  barcode: string | null
  productGroup: { name: string }
}

const PAYMENT_METHODS = ["Cash", "Transfer", "POS"]

export default function POSPage() {
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<ProductHit[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState("Transfer")
  const [customer, setCustomer] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Load the whole active catalogue once so reps can browse before searching.
  const loadProducts = useCallback(() => {
    setLoadingProducts(true)
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const onSearch = useCallback((value: string) => setSearch(value), [])

  // Browse the full list before searching; the search box just narrows it.
  const query = search.trim().toLowerCase()
  const filteredProducts = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.barcode || "").toLowerCase().includes(query) ||
          (p.productGroup?.name || p.category || "").toLowerCase().includes(query)
      )
    : products

  function addToCart(v: ProductHit) {
    if (v.currentStock < 1) {
      toast.error(`${v.name} is out of stock`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === v.id)
      if (existing) {
        if (existing.qty >= existing.stock) {
          toast.error(`Only ${existing.stock} of ${v.name} in stock`)
          return prev
        }
        return prev.map((c) =>
          c.variantId === v.id
            ? { ...c, qty: c.qty + 1, lineTotal: (c.qty + 1) * c.enteredPrice - c.discount }
            : c
        )
      }
      return [
        ...prev,
        {
          variantId: v.id,
          sku: v.sku,
          name: v.name,
          category: v.productGroup?.name || v.category,
          startingPrice: v.startingPrice,
          suggestedPrice: v.suggestedPrice,
          enteredPrice: v.suggestedPrice,
          qty: 1,
          discount: 0,
          lineTotal: v.suggestedPrice,
          stock: v.currentStock,
        },
      ]
    })
    setSearch("")
    searchRef.current?.focus()
  }

  function addCustomToCart(name: string, price: number, qty: number, unitCost: number) {
    setCart((prev) => [
      ...prev,
      {
        variantId: `custom-${Date.now()}`,
        sku: "NEW",
        name,
        category: "Not in catalogue",
        startingPrice: 0,
        suggestedPrice: price,
        enteredPrice: price,
        qty,
        discount: 0,
        lineTotal: price * qty,
        stock: Number.MAX_SAFE_INTEGER,
        custom: true,
        unitCost,
      },
    ])
    setCustomOpen(false)
    toast.success(`Added "${name}"`, { description: "It'll be sent for the owner to add to the catalogue." })
  }

  function updateQty(variantId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.variantId !== variantId) return c
        const newQty = Math.max(1, Math.min(c.qty + delta, c.stock))
        return { ...c, qty: newQty, lineTotal: newQty * c.enteredPrice - c.discount }
      })
    )
  }

  function updatePrice(variantId: string, value: string) {
    const price = Number(value)
    setCart((prev) =>
      prev.map((c) => {
        if (c.variantId !== variantId) return c
        if (isNaN(price) || price < 0) return { ...c, enteredPrice: 0, lineTotal: -c.discount }
        return { ...c, enteredPrice: price, lineTotal: c.qty * price - c.discount }
      })
    )
  }

  function updateDiscount(variantId: string, value: string) {
    const discount = Math.max(0, Number(value) || 0)
    setCart((prev) =>
      prev.map((c) => {
        if (c.variantId !== variantId) return c
        const minTotal = c.qty * c.startingPrice
        const lineSubtotal = c.qty * c.enteredPrice
        const maxDiscount = Math.max(0, lineSubtotal - minTotal)
        const finalDiscount = Math.min(discount, maxDiscount)
        return { ...c, discount: finalDiscount, lineTotal: lineSubtotal - finalDiscount }
      })
    )
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((c) => c.variantId !== variantId))
  }

  const subtotal = cart.reduce((s, c) => s + c.qty * c.enteredPrice, 0)
  const totalDiscount = cart.reduce((s, c) => s + c.discount, 0)
  const totalUnits = cart.reduce((s, c) => s + c.qty, 0)
  const total = cart.reduce((s, c) => s + c.lineTotal, 0)

  const isValidPrice = (price: number, startingPrice: number) => price >= startingPrice
  const priceErrors = cart.filter((c) => !isValidPrice(c.enteredPrice, c.startingPrice))

  async function submitSale() {
    if (cart.length === 0) return
    if (priceErrors.length > 0) {
      toast.error("Some items are priced below the minimum")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) =>
            c.custom
              ? { custom: true, name: c.name, qty: c.qty, enteredPrice: c.enteredPrice, discount: c.discount, unitCost: c.unitCost }
              : { variantId: c.variantId, qty: c.qty, enteredPrice: c.enteredPrice, discount: c.discount }
          ),
          paymentMethod,
          channel: "In-store",
          customer: customer || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sale failed")
      setLastReceipt(data.receiptRef)
      toast.success("Sale completed", { description: `${data.receiptRef} · ${formatCurrency(data.total)}` })
      loadProducts() // refresh stock counts after the sale
      setTimeout(() => {
        setCart([])
        setCustomer("")
        setLastReceipt(null)
        searchRef.current?.focus()
      }, 1800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sale failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <RepHeader />

      {lastReceipt && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur flex items-center justify-center animate-fade-in">
          <div className="text-center animate-scale-in px-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-11 h-11 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Sale complete!</h2>
            <p className="text-sm text-slate-500 mt-1">Receipt {lastReceipt}</p>
            <p className="text-2xl font-bold text-slate-900 mt-3">{formatCurrency(total)}</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-32 sm:pb-8">
        {/* Search */}
        <div className="relative animate-fade-in">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search product, scan barcode, or type SKU…"
            className="input pl-12 text-base shadow-sm"
            style={{ height: "3.25rem" }}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {/* Off-catalogue item */}
        <button onClick={() => setCustomOpen(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          <PackagePlus className="w-4 h-4" /> Sell an item that&apos;s not listed
        </button>

        {/* Cart */}
        <div className="mt-4 card overflow-hidden animate-slide-up">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-[18px] h-[18px] text-indigo-600" />
              <span className="font-semibold text-sm text-slate-900">Current Sale</span>
              {cart.length > 0 && (
                <span className="badge badge-brand">{totalUnits} item{totalUnits !== 1 ? "s" : ""}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors">
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">Your cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Tap a product below to add it</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cart.map((item, idx) => {
                const validPrice = isValidPrice(item.enteredPrice, item.startingPrice)
                return (
                  <div key={item.variantId} className="px-4 py-3.5 animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-slate-900 truncate">{item.name}</span>
                          {item.custom && <span className="badge badge-amber flex-shrink-0">New</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.custom ? "Not in catalogue" : `${item.sku} · ${item.category}`}</div>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="btn btn-ghost btn-icon text-slate-300 hover:text-red-500 ml-2 flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-end gap-2">
                      {/* Qty */}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Qty</label>
                        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                          <button onClick={() => updateQty(item.variantId, -1)} className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-semibold text-sm text-slate-900">{item.qty}</span>
                          <button onClick={() => updateQty(item.variantId, 1)} disabled={item.qty >= item.stock} className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-40">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Price (₦)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={item.enteredPrice || ""}
                          onChange={(e) => updatePrice(item.variantId, e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-sm rounded-lg border text-center font-semibold transition-colors ${
                            !validPrice ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-900 focus:border-indigo-400"
                          }`}
                        />
                      </div>

                      {/* Discount */}
                      <div className="w-16">
                        <label className="text-xs text-slate-400 mb-1 block">Disc.</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={item.discount || ""}
                          onChange={(e) => updateDiscount(item.variantId, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-center text-slate-900 focus:border-indigo-400"
                        />
                      </div>

                      {/* Total */}
                      <div className="w-20 text-right">
                        <label className="text-xs text-slate-400 mb-1 block">Total</label>
                        <div className="font-bold text-sm text-slate-900 py-1.5">{formatCurrency(item.lineTotal)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {item.custom ? (
                        <span className="text-amber-600">New product — the owner will review &amp; add it to the catalogue</span>
                      ) : !validPrice ? (
                        <span className="text-red-500 font-medium">Min price {formatCurrency(item.startingPrice)}</span>
                      ) : (
                        <>
                          <span className="text-slate-400">Min {formatCurrency(item.startingPrice)}</span>
                          <span className="text-indigo-600 font-medium">Suggested {formatCurrency(item.suggestedPrice)}</span>
                          <span className="text-slate-400 ml-auto">{item.stock} in stock</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {cart.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/60">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-700 font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-600">Discount</span>
                  <span className="text-green-600 font-medium">−{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">{formatCurrency(total)}</span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="label flex items-center gap-1.5"><Banknote className="w-4 h-4 text-slate-400" /> Payment method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          paymentMethod === m
                            ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Customer (optional)</label>
                  <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Customer name"
                    className="input h-11"
                  />
                </div>

                <button
                  onClick={submitSale}
                  disabled={submitting || priceErrors.length > 0}
                  className="btn btn-primary btn-lg w-full text-base"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    `Complete Sale · ${formatCurrency(total)}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Browse — all products, tap to add */}
        <div className="mt-5 animate-slide-up">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-sm font-semibold text-slate-900">{query ? "Search results" : "All products"}</span>
            <span className="text-xs text-slate-400">
              {loadingProducts ? "Loading…" : `${filteredProducts.length} item${filteredProducts.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-[5.5rem] rounded-xl" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card text-center py-10 px-4">
              <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{query ? `No products match “${search}”` : "No products in the catalogue yet"}</p>
              {query && (
                <button onClick={() => setCustomOpen(true)} className="btn btn-secondary btn-sm mt-3">
                  <PackagePlus className="w-4 h-4" /> Sell “{search}” as a new item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredProducts.map((v) => {
                const out = v.currentStock < 1
                const low = v.currentStock <= 5
                return (
                  <button
                    key={v.id}
                    onClick={() => addToCart(v)}
                    disabled={out}
                    className="text-left card card-hover p-3 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium text-sm text-slate-900 line-clamp-2 min-h-[2.5rem]">{v.name}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-semibold text-sm text-slate-900">{formatCurrency(v.suggestedPrice)}</span>
                      <span className={`text-xs font-medium ${out ? "text-red-500" : low ? "text-amber-600" : "text-slate-400"}`}>
                        {out ? "Out" : `${v.currentStock} left`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{v.productGroup?.name || v.category}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CustomItemModal open={customOpen} onClose={() => setCustomOpen(false)} onAdd={addCustomToCart} initialName={search} />
    </div>
  )
}

function CustomItemModal({
  open, onClose, onAdd, initialName,
}: {
  open: boolean
  onClose: () => void
  onAdd: (name: string, price: number, qty: number, unitCost: number) => void
  initialName?: string
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [qty, setQty] = useState("1")
  const [cost, setCost] = useState("")

  useEffect(() => {
    if (open) {
      setName(initialName?.trim() || "")
      setPrice("")
      setQty("1")
      setCost("")
    }
  }, [open, initialName])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const p = Number(price)
    const q = Math.max(1, Math.floor(Number(qty) || 1))
    if (!name.trim()) { toast.error("Enter the product name"); return }
    if (!Number.isFinite(p) || p <= 0) { toast.error("Enter a valid price"); return }
    onAdd(name.trim(), Math.round(p), q, Math.max(0, Math.round(Number(cost) || 0)))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sell a new item"
      description="Not in the catalogue yet? Sell it now — the owner will review and add it."
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
          <button onClick={submit} className="btn btn-primary btn-md">Add to sale</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Product name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 65W GaN Charger" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Price (₦)</label>
            <input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="input" />
          </div>
          <div>
            <label className="label">Qty</label>
            <input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Cost <span className="text-slate-300">(opt)</span></label>
            <input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="input" />
          </div>
        </div>
        <p className="text-xs text-slate-400">Adding the cost helps track profit. Leave it blank if you&apos;re not sure.</p>
      </form>
    </Modal>
  )
}
