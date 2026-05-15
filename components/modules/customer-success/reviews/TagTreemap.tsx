'use client'

import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import { ThumbsDown, ThumbsUp, X } from 'lucide-react'
import type { TagDistRow } from '@/lib/reviews/types'

interface Props {
  rows: TagDistRow[]
  /** Currently selected positive tag (filters Latest Good). */
  selectedPositive?: string | null
  /** Currently selected negative tag (filters Latest Bad). */
  selectedNegative?: string | null
  /** Click on a positive tile — null to clear. */
  onSelectPositive?: (tag: string | null) => void
  /** Click on a negative tile — null to clear. */
  onSelectNegative?: (tag: string | null) => void
}

interface LeafNode {
  name:  string
  size:  number
  count: number
  // Recharts' TreemapDataType requires an index signature.
  [key: string]: unknown
}

export function TagTreemap({
  rows,
  selectedPositive = null,
  selectedNegative = null,
  onSelectPositive,
  onSelectNegative,
}: Props) {
  const positive = rows.filter((r) => r.kind === 'positive').sort((a, b) => b.count - a.count)
  const negative = rows.filter((r) => r.kind === 'negative').sort((a, b) => b.count - a.count)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel
        title="Positive tags"
        icon={<ThumbsUp className="w-4 h-4 text-mvr-success" />}
        accent="bg-mvr-success-light"
        rows={positive}
        fill="#2D6A4F"
        selectedFill="#1A4632"
        selected={selectedPositive}
        onSelect={onSelectPositive}
        emptyLabel="No positive tags reported."
      />
      <Panel
        title="Negative tags"
        icon={<ThumbsDown className="w-4 h-4 text-mvr-danger" />}
        accent="bg-mvr-danger-light"
        rows={negative}
        fill="#8B2030"
        selectedFill="#5C151F"
        selected={selectedNegative}
        onSelect={onSelectNegative}
        emptyLabel="No negative tags reported."
      />
    </div>
  )
}

interface PanelProps {
  title:        string
  icon:         React.ReactNode
  accent:       string
  rows:         TagDistRow[]
  fill:         string
  selectedFill: string
  selected:     string | null | undefined
  onSelect?:    (tag: string | null) => void
  emptyLabel:   string
}

function Panel({
  title, icon, accent, rows, fill, selectedFill,
  selected, onSelect, emptyLabel,
}: PanelProps) {
  const data: LeafNode[] = rows.map((r) => ({ name: r.tag, size: r.count, count: r.count }))
  const total = rows.reduce((s, r) => s + r.count, 0)

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl shadow-card overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2 ${accent}`}>
        {icon}
        <h3 className="text-sm font-semibold text-mvr-primary">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{total.toLocaleString()} mentions</span>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            className="inline-flex items-center gap-1 ml-2 rounded-full bg-white border border-[#E0DBD4] px-2 py-0.5 text-xs text-mvr-primary"
            aria-label="Clear tag filter"
          >
            Filter: {selected} <X className="w-3 h-3" />
          </button>
        ) : null}
      </div>
      <div className="p-2" style={{ width: '100%', height: 260 }}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            {emptyLabel}
          </div>
        ) : (
          <ResponsiveContainer>
            <Treemap
              data={data}
              dataKey="size"
              stroke="#FFFFFF"
              fill={fill}
              isAnimationActive={false}
              content={
                <TagTile
                  selected={selected ?? null}
                  selectedFill={selectedFill}
                  onSelect={onSelect}
                />
              }
            >
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E0DBD4', fontSize: 12 }}
                formatter={(_v, _n, ctx) => {
                  const p = ctx?.payload as LeafNode | undefined
                  if (!p) return ['', '']
                  const share = total > 0 ? ((p.count / total) * 100).toFixed(1) : '0.0'
                  return [`${p.count.toLocaleString()} (${share}%)`, p.name]
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

interface TagTileProps {
  x?:            number
  y?:            number
  width?:        number
  height?:       number
  fill?:         string
  name?:         string
  count?:        number
  selected?:     string | null
  selectedFill?: string
  onSelect?:     (tag: string | null) => void
}

function TagTile(props: TagTileProps) {
  const {
    x = 0, y = 0, width = 0, height = 0,
    fill = '#1E2D40', name = '', count = 0,
    selected = null, selectedFill, onSelect,
  } = props
  const fits       = width > 64 && height > 26
  const isSelected = selected === name
  const isDimmed   = selected != null && !isSelected
  const tileFill   = isSelected && selectedFill ? selectedFill : fill
  const opacity    = isDimmed ? 0.35 : 1

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect?.(isSelected ? null : name)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill:        tileFill,
          stroke:      isSelected ? '#1E2D40' : '#FFFFFF',
          strokeWidth: isSelected ? 3 : 2,
          opacity,
        }}
      />
      {fits ? (
        <>
          <text x={x + 6} y={y + 16} fill="#FFFFFF" fontSize={11} fontWeight={600}>
            {name}
          </text>
          {height > 40 ? (
            <text x={x + 6} y={y + 30} fill="#FFFFFF" opacity={0.85} fontSize={10}>
              {count.toLocaleString()}
            </text>
          ) : null}
        </>
      ) : null}
    </g>
  )
}
