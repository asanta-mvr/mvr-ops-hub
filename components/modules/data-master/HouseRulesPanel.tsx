'use client'

import { useState, useMemo } from 'react'

interface Section {
  title: string
  content: string
}

/**
 * Parses free-text rules into named sections using a cascade of heading detectors:
 * 1. Markdown # / ## headings
 * 2. **Bold** standalone lines
 * 3. ALL CAPS standalone lines
 * 4. Short title-case lines (≤ 50 chars, no terminal punctuation) followed by content
 * Falls back to a single "Rules" tab if no headings are found.
 */
function parseRules(text: string): Section[] {
  const lines = text.split('\n')

  // Strategy 1 — markdown headings: lines starting with # or ##
  const mdPattern = /^#{1,3}\s+(.+)$/
  if (lines.some((l) => mdPattern.test(l.trim()))) {
    return extractSections(lines, (l) => {
      const m = l.trim().match(mdPattern)
      return m ? m[1].trim() : null
    })
  }

  // Strategy 2 — **bold** standalone lines
  const boldPattern = /^\*\*(.+)\*\*$/
  if (lines.some((l) => boldPattern.test(l.trim()))) {
    return extractSections(lines, (l) => {
      const m = l.trim().match(boldPattern)
      return m ? m[1].trim() : null
    })
  }

  // Strategy 3 — ALL CAPS lines (3+ chars, no punctuation, not a list item)
  const capsPattern = /^[A-Z][A-Z\s\-–—&/]{2,}$/
  if (lines.some((l) => capsPattern.test(l.trim()) && !l.trim().startsWith('-') && !l.trim().match(/^\d+\./))) {
    return extractSections(lines, (l) => {
      const t = l.trim()
      return capsPattern.test(t) && !t.startsWith('-') && !t.match(/^\d+\./) ? t : null
    })
  }

  // Strategy 4 — short standalone title lines (≤ 50 chars, not ending in . , ; :)
  const titleLines = lines.filter((l, i) => {
    const t = l.trim()
    if (!t || t.length > 50) return false
    if (/[.,;]$/.test(t)) return false
    if (t.startsWith('-') || t.match(/^\d+\./)) return false
    const next = lines[i + 1]?.trim()
    const prev = lines[i - 1]?.trim()
    return (!prev || prev === '') && next && next !== ''
  })

  if (titleLines.length >= 2) {
    const titleSet = new Set(titleLines.map((l) => l.trim()))
    return extractSections(lines, (l) => (titleSet.has(l.trim()) ? l.trim() : null))
  }

  // Fallback — single section
  return [{ title: 'Rules', content: text.trim() }]
}

function extractSections(
  lines: string[],
  isHeading: (line: string) => string | null,
): Section[] {
  const sections: Section[] = []
  let currentTitle: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const heading = isHeading(line)
    if (heading) {
      if (currentTitle !== null) {
        const content = currentLines.join('\n').trim()
        if (content) sections.push({ title: currentTitle, content })
      }
      currentTitle = heading
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentTitle !== null) {
    const content = currentLines.join('\n').trim()
    if (content) sections.push({ title: currentTitle, content })
  }

  // Content that appeared before any heading
  return sections
}

/**
 * Renders section body with lightweight markdown:
 * - ### sub-headings become bold labels
 * - Numbered lists and bullet lists rendered as-is (whitespace-pre-wrap)
 */
function RulesContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const subheading = line.trim().match(/^#{1,3}\s+(.+)$/)

    if (subheading) {
      nodes.push(
        <p key={i} className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mt-3 mb-1">
          {subheading[1]}
        </p>
      )
    } else {
      nodes.push(
        <span key={i} className="block whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
          {line || '\u00A0'}
        </span>
      )
    }
    i++
  }

  return <div className="min-h-[80px]">{nodes}</div>
}

export default function HouseRulesPanel({ rules }: { rules: string }) {
  const sections = useMemo(() => parseRules(rules), [rules])
  const [activeIdx, setActiveIdx] = useState(0)

  if (sections.length === 0) return null

  const active = sections[Math.min(activeIdx, sections.length - 1)]

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Panel title */}
      <div className="px-5 py-3 border-b border-[#E0DBD4]">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">House Rules</h2>
      </div>

      {/* Tab header — only show if multiple sections */}
      {sections.length > 1 && (
        <div className="flex border-b border-[#E0DBD4] overflow-x-auto">
          {sections.map((section, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`shrink-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeIdx === idx
                  ? 'text-mvr-primary border-b-2 border-mvr-primary -mb-px bg-white'
                  : 'text-muted-foreground hover:text-mvr-primary hover:bg-mvr-cream'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-5 min-h-[120px]">
        <RulesContent content={active.content} />
      </div>
    </div>
  )
}
