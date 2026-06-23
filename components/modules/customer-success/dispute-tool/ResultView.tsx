'use client'

import { Fragment, type ReactNode } from 'react'
import type { DisputeCaseTypeT, DisputeProbs } from '@/lib/disputes/types'

const METRIC_LABELS: Record<string, string> = {
  REVIEW_REMOVAL: 'Review removal',
  ECONOMIC_DISPUTE: 'Economic dispute',
  REMOVAL_PROBABILITY: 'Removal probability',
  CASE_STRENGTH: 'Case strength',
}

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase()
}

// Spec §7.3 thresholds, mapped to MVR tokens.
function toneFor(value: number): { bar: string; text: string; bg: string } {
  if (value >= 70) return { bar: 'bg-mvr-success', text: 'text-mvr-success', bg: 'bg-mvr-success-light' }
  if (value >= 40) return { bar: 'bg-mvr-warning', text: 'text-mvr-warning', bg: 'bg-mvr-warning-light' }
  return { bar: 'bg-mvr-danger', text: 'text-mvr-danger', bg: 'bg-mvr-danger-light' }
}

// For review-removal cases the spec shows only the removal metric; OTA disputes
// show everything available.
function visibleProbs(probs: DisputeProbs, caseType: DisputeCaseTypeT): [string, number][] {
  const entries = Object.entries(probs)
  if (caseType === 'review') {
    const removal = entries.filter(([k]) => k === 'REVIEW_REMOVAL' || k === 'REMOVAL_PROBABILITY')
    return removal.length ? removal : entries
  }
  return entries
}

function ProbCards({ probs, caseType }: { probs: DisputeProbs; caseType: DisputeCaseTypeT }) {
  const entries = visibleProbs(probs, caseType)
  if (!entries.length) return null
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}>
      {entries.map(([key, value]) => {
        const tone = toneFor(value)
        return (
          <div key={key} className={`rounded-xl border border-[#E0DBD4] p-3 shadow-card ${tone.bg}`}>
            <div className="text-xs text-muted-foreground">{metricLabel(key)}</div>
            <div className={`text-2xl font-display ${tone.text}`}>{value}%</div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-black/5">
              <div className={`h-1.5 rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Minimal markdown renderer (spec §7.4) — no external deps ────────────────
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on **bold** and `code`, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={k} className="font-semibold text-mvr-primary">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={k} className="rounded bg-mvr-neutral px-1 py-0.5 text-xs">{part.slice(1, -1)}</code>
    }
    return <Fragment key={k}>{part}</Fragment>
  })
}

function MarkdownView({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let key = 0

  const flushList = () => {
    if (!list.length) return
    const items = list
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 space-y-1 pl-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-mvr-olive">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mvr-steel" />
            <span>{renderInline(it, `li-${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ''))
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      list.push(line.replace(/^\s*\d+\.\s+/, ''))
      continue
    }
    flushList()
    if (!line.trim()) continue
    if (/^###\s+/.test(line)) {
      blocks.push(<h4 key={`h-${key++}`} className="mt-4 text-sm font-semibold uppercase tracking-wide text-mvr-primary">{renderInline(line.replace(/^###\s+/, ''), `h${key}`)}</h4>)
    } else if (/^##\s+/.test(line)) {
      blocks.push(<h3 key={`h-${key++}`} className="mt-4 text-base font-bold text-mvr-primary">{renderInline(line.replace(/^##\s+/, ''), `h${key}`)}</h3>)
    } else if (/^#\s+/.test(line)) {
      blocks.push(<h2 key={`h-${key++}`} className="mt-4 font-display text-lg text-mvr-primary">{renderInline(line.replace(/^#\s+/, ''), `h${key}`)}</h2>)
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${key++}`} className="my-4 border-t border-[#E0DBD4]" />)
    } else {
      blocks.push(<p key={`p-${key++}`} className="my-2 text-sm leading-relaxed text-mvr-olive">{renderInline(line, `p${key}`)}</p>)
    }
  }
  flushList()
  return <div>{blocks}</div>
}

interface Props {
  probs: DisputeProbs | null
  resultText: string | null
  caseType: DisputeCaseTypeT
}

export function ResultView({ probs, resultText, caseType }: Props) {
  return (
    <div className="space-y-4">
      {probs ? <ProbCards probs={probs} caseType={caseType} /> : null}
      {resultText ? (
        <div className="rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
          <MarkdownView text={resultText} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No analysis text.</p>
      )}
    </div>
  )
}
