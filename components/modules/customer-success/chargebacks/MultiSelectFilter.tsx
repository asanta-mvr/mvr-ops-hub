'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search as SearchIcon, X, type LucideIcon } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  icon: LucideIcon
  /** Plain label shown when nothing is selected (e.g. "All buildings"). */
  allLabel: string
  /** Singular noun for the "(N) selected" summary (e.g. "building"). */
  itemNoun: string
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Min trigger width — keeps the row visually stable as labels change. */
  minWidth?: string
  ariaLabel: string
  /** Shows an inline search input inside the dropdown — useful for long lists
   *  (e.g. units). Filters `options` by case-insensitive substring on `label`. */
  searchable?: boolean
  /** Placeholder for the search input. Defaults to "Search…". */
  searchPlaceholder?: string
}

export function MultiSelectFilter({
  icon: Icon,
  allLabel,
  itemNoun,
  options,
  selected,
  onChange,
  minWidth = '180px',
  ariaLabel,
  searchable = false,
  searchPlaceholder = 'Search…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const hasSelection = selected.length > 0
  const active = hasSelection
  const allValid = options.map((o) => o.value)
  const filteredSelected = selected.filter((s) => allValid.includes(s))

  // Trigger label: empty → allLabel, 1 → that label, N → "N <plural noun>"
  const triggerLabel = (() => {
    if (filteredSelected.length === 0) return allLabel
    if (filteredSelected.length === 1) {
      const opt = options.find((o) => o.value === filteredSelected[0])
      return opt?.label ?? filteredSelected[0]
    }
    const plural = itemNoun.endsWith('s') ? itemNoun : `${itemNoun}s`
    return `${filteredSelected.length} ${plural}`
  })()

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // When the dropdown opens, auto-focus the search input (if any) so the user
  // can start typing immediately. When it closes, clear the query so the next
  // open starts fresh.
  useEffect(() => {
    if (open && searchable) {
      searchInputRef.current?.focus()
    } else if (!open) {
      setQuery('')
    }
  }, [open, searchable])

  const visibleOptions = useMemo(() => {
    if (!searchable || query.trim() === '') return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, searchable, query])

  function toggleValue(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
    else onChange([...selected, v])
  }

  function clearAll(e?: React.MouseEvent) {
    e?.stopPropagation()
    onChange([])
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className={[
          'group relative w-full inline-flex items-center gap-2 text-sm rounded-md pl-8 pr-8 py-1.5 bg-white',
          'border focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary',
          'transition-colors text-left',
          active
            ? 'border-mvr-primary text-mvr-primary font-medium'
            : 'border-[#E0DBD4] text-mvr-primary',
        ].join(' ')}
      >
        <Icon
          className={`absolute left-2.5 w-4 h-4 pointer-events-none transition-colors ${
            active ? 'text-mvr-primary' : 'text-mvr-sand'
          }`}
          aria-hidden
        />
        <span className="truncate">{triggerLabel}</span>
        {hasSelection ? (
          <span
            role="button"
            aria-label={`Clear ${ariaLabel}`}
            onClick={clearAll}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                clearAll()
              }
            }}
            tabIndex={0}
            className="absolute right-2 p-0.5 rounded text-muted-foreground hover:text-mvr-primary hover:bg-mvr-neutral cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className="absolute right-2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
        )}
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          className="absolute z-50 top-full left-0 mt-1 min-w-full max-w-[280px] bg-white border border-[#E0DBD4] rounded-md shadow-panel"
        >
          {searchable && (
            <div className="sticky top-0 bg-white border-b border-[#E0DBD4] p-1.5">
              <div className="relative">
                <SearchIcon
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${itemNoun}`}
                  className="w-full text-xs rounded-md pl-7 pr-2 py-1 bg-white border border-[#E0DBD4] text-mvr-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
                />
              </div>
            </div>
          )}
          <div className="max-h-[260px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = selected.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleValue(opt.value)}
                    className={[
                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-left',
                      'transition-colors',
                      isSelected
                        ? 'bg-mvr-primary-light text-mvr-primary'
                        : 'text-mvr-primary hover:bg-mvr-cream',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className={[
                        'inline-flex items-center justify-center w-4 h-4 rounded-sm border flex-shrink-0',
                        isSelected
                          ? 'bg-mvr-primary border-mvr-primary text-white'
                          : 'bg-white border-[#E0DBD4]',
                      ].join(' ')}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
