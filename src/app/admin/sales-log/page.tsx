"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "@/components/ui/sonner";
import { Download, Receipt } from "lucide-react";

interface SaleRecord {
  id: string;
  timestamp: string;
  receiptRef: string;
  productName: string;
  staffName: string;
  qty: number;
  enteredPrice: number;
  discount: number;
  totalAmount: number;
  grossProfit: number;
  paymentMethod: string;
  customer: string | null;
}

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

export default function AdminSalesLogPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "week" | "month" | "all">(
    "today",
  );
  const [repFilter, setRepFilter] = useState("");
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/sales-reps")
      .then((r) => r.json())
      .then((d) => setReps(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const p = new URLSearchParams({ filter });
    if (repFilter) p.set("repId", repFilter);
    fetch(`/api/sales?${p}`)
      .then((r) => r.json())
      .then((d) => active && setSales(Array.isArray(d) ? d : []))
      .catch(() => active && setSales([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filter, repFilter]);

  function exportCSV() {
    if (sales.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      [
        "Timestamp",
        "Receipt",
        "Staff",
        "Product",
        "Qty",
        "Price",
        "Discount",
        "Total",
        "Profit",
        "Payment",
        "Customer",
      ],
    ];
    for (const s of sales) {
      rows.push([
        new Date(s.timestamp).toISOString(),
        s.receiptRef,
        s.staffName,
        s.productName,
        String(s.qty),
        String(s.enteredPrice),
        String(s.discount),
        String(s.totalAmount),
        String(s.grossProfit),
        s.paymentMethod,
        s.customer || "",
      ]);
    }
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `my-sales-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success(
      `Exported ${sales.length} sale${sales.length !== 1 ? "s" : ""}`,
    );
  }

  const totalAmount = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalProfit = sales.reduce((s, x) => s + x.grossProfit, 0);

  return (
    <div className='max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12'>
      <PageHeader
        title='Sales Log'
        subtitle='Every recorded sale across the shop'
        actions={
          <>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className='select text-sm py-2 w-36'>
              <option value=''>All Staff</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button onClick={exportCSV} className='btn btn-secondary btn-md'>
              <Download className='w-4 h-4' /> Export
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className='flex gap-2 mb-5 overflow-x-auto hide-scrollbar'>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className='grid grid-cols-3 gap-3 mb-5'>
        <div className='card p-4'>
          <div className='text-xs text-slate-400 font-medium mb-1'>Revenue</div>
          <div className='text-lg font-bold text-slate-900 truncate'>
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <div className='card p-4'>
          <div className='text-xs text-slate-400 font-medium mb-1'>Profit</div>
          <div className='text-lg font-bold text-green-600 truncate'>
            {formatCurrency(totalProfit)}
          </div>
        </div>
        <div className='card p-4'>
          <div className='text-xs text-slate-400 font-medium mb-1'>Sales</div>
          <div className='text-lg font-bold text-slate-900'>{sales.length}</div>
        </div>
      </div>

      {loading ? (
        <div className='space-y-2'>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className='skeleton h-20 rounded-2xl' />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className='card text-center py-16 px-4'>
          <div className='w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3'>
            <Receipt className='w-7 h-7 text-slate-300' />
          </div>
          <p className='text-sm font-medium text-slate-600'>No sales found</p>
          <p className='text-xs text-slate-400 mt-1'>
            Try a different range or staff filter
          </p>
        </div>
      ) : (
        <div className='space-y-2'>
          {sales.map((s, i) => (
            <div
              key={s.id}
              className='card card-hover p-4 animate-slide-up'
              style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}>
              <div className='flex justify-between items-start mb-2'>
                <div className='min-w-0'>
                  <div className='font-medium text-sm text-slate-900 truncate'>
                    {s.productName}
                  </div>
                  <div className='text-xs text-slate-400'>
                    {s.receiptRef} · {s.staffName}
                    {s.customer ? ` · ${s.customer}` : ""}
                  </div>
                </div>
                <div className='text-right flex-shrink-0 ml-3'>
                  <div className='font-bold text-sm text-slate-900'>
                    {formatCurrency(s.totalAmount)}
                  </div>
                  <div className='text-xs text-green-600 font-medium'>
                    +{formatCurrency(s.grossProfit)}
                  </div>
                </div>
              </div>
              <div className='flex justify-between items-center text-xs text-slate-500'>
                <span>{formatDateTime(new Date(s.timestamp))}</span>
                <span className='flex items-center gap-2'>
                  <span>
                    {s.qty} × {formatCurrency(s.enteredPrice)}
                  </span>
                  <span className='badge badge-gray'>{s.paymentMethod}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
