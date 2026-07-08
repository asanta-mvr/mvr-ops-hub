'use client'

import { useEffect, useState } from 'react'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'

// A create-as-you-type dropdown for owner tag fields (type, category, language).
// Options are loaded from /api/v1/owners/field-options and new ones typed into
// the search box can be added ("Add <x>") — they persist and reappear next time.
export function OwnerTagSelect({
  field,
  value,
  onChange,
  initialOptions = [],
  placeholder,
}: {
  field: 'type' | 'category' | 'language'
  value: string
  onChange: (value: string) => void
  initialOptions?: string[]
  placeholder?: string
}) {
  const [options, setOptions] = useState<SelectOption[]>(
    initialOptions.map((l) => ({ value: l, label: l }))
  )

  useEffect(() => {
    let active = true
    fetch(`/api/v1/owners/field-options?field=${field}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: { value: string; label: string }[] }) => {
        if (!active) return
        const map = new Map<string, SelectOption>()
        for (const l of initialOptions) map.set(l, { value: l, label: l })
        for (const o of j.data ?? []) map.set(o.value, { value: o.value, label: o.label })
        if (value && !map.has(value)) map.set(value, { value, label: value })
        setOptions(Array.from(map.values()))
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field])

  async function addNew(label: string) {
    const res = await fetch('/api/v1/owners/field-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, label }),
    })
    if (!res.ok) return
    const j = (await res.json()) as { data: { value: string; label: string } }
    const opt = { value: j.data.value, label: j.data.label }
    setOptions((prev) => (prev.some((o) => o.value === opt.value) ? prev : [...prev, opt]))
    onChange(opt.value)
  }

  return (
    <SearchableSelect
      options={options}
      value={value || null}
      onChange={onChange}
      placeholder={placeholder ?? 'Select…'}
      searchPlaceholder="Search or type to add…"
      onAddNew={addNew}
    />
  )
}
