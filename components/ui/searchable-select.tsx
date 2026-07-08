'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Check, Plus } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  keywords?: string // extra text to match on (e.g. dial code)
}

interface Props {
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  // Custom trigger content (e.g. show only "+57" for a phone country picker).
  triggerLabel?: (selected: SelectOption | null) => React.ReactNode
  // When provided, an "Add <search>" row appears for values not already present.
  onAddNew?: (label: string) => void | Promise<void>
}

/**
 * A lightweight searchable dropdown: a trigger button + a popover with a filter
 * input and an options list. Optionally supports creating a new option inline.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  triggerLabel,
  onAddNew,
}: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = options.find((o) => o.value === value) ?? null
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? options.filter(
        (o) => o.label.toLowerCase().includes(needle) || (o.keywords ?? '').toLowerCase().includes(needle)
      )
    : options
  const exact = options.some((o) => o.label.toLowerCase() === needle)
  const showAdd = Boolean(onAddNew) && needle.length > 0 && !exact

  async function handleAdd() {
    if (!onAddNew) return
    setBusy(true)
    try {
      await onAddNew(q.trim())
      setOpen(false)
      setQ('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>
          {triggerLabel ? triggerLabel(selected) : selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[14rem] rounded-lg border bg-white shadow-panel">
          <div className="p-2 border-b border-[#E0DBD4]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left hover:bg-mvr-neutral/50"
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="w-3.5 h-3.5 text-mvr-primary shrink-0" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && !showAdd && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>
            )}
            {showAdd && (
              <li className="border-t border-[#E0DBD4]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAdd}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-left text-mvr-primary hover:bg-mvr-primary-light disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {busy ? 'Adding…' : `Add "${q.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
