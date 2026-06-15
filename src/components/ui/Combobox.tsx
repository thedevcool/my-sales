"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Plus, Check } from "lucide-react"

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  /** Word used in the "will be created" hint, e.g. "brand" or "category". */
  noun?: string
}

/**
 * Pick an existing option or type a brand-new one. Free text is allowed; if the
 * typed value isn't in the list, a "will be created" hint is shown so the owner
 * knows it'll be added. The server get-or-creates on submit.
 */
export function Combobox({ value, onChange, options, placeholder, noun = "item" }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const q = value.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  const exactMatch = options.some((o) => o.toLowerCase() === q)
  const isNew = q.length > 0 && !exactMatch

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input pr-9"
          autoComplete="off"
        />
        <button type="button" onClick={() => setOpen((o) => !o)} tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto animate-scale-in">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false) }}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-700">{o}</span>
              {o.toLowerCase() === q && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full px-3.5 py-2.5 flex items-center gap-2 text-left text-sm border-t border-slate-100 text-indigo-600 hover:bg-indigo-50/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add new {noun} “{value.trim()}”
            </button>
          )}
          {filtered.length === 0 && !isNew && (
            <div className="px-3.5 py-3 text-sm text-slate-400">No {noun}s yet — type to add one</div>
          )}
        </div>
      )}
    </div>
  )
}
