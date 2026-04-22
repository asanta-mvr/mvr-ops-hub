'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

interface ContentBlock {
  title: string
  description: string
}

function parseToBlocks(text: string | null): ContentBlock[] {
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof (parsed[0] as { title?: unknown }).title === 'string'
    ) {
      return parsed as ContentBlock[]
    }
  } catch {}
  return parseTextToBlocks(text)
}

function parseTextToBlocks(text: string): ContentBlock[] {
  const lines = text.split('\n')
  const blocks: ContentBlock[] = []
  let currentTitle: string | null = null
  let currentLines: string[] = []

  function detectHeading(line: string): string | null {
    const t = line.trim()
    const md = t.match(/^#{1,3}\s+(.+)$/)
    if (md) return md[1].trim()
    const bold = t.match(/^\*\*(.+)\*\*$/)
    if (bold) return bold[1].trim()
    if (/^[A-Z][A-Z\s\-–—&/]{2,}$/.test(t) && !t.startsWith('-')) return t
    return null
  }

  function flush() {
    if (currentTitle !== null) {
      const desc = currentLines.join('\n').trim()
      if (desc) blocks.push({ title: currentTitle, description: desc })
    }
  }

  for (const line of lines) {
    const heading = detectHeading(line)
    if (heading) {
      flush()
      currentTitle = heading
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  flush()

  if (blocks.length === 0) {
    return [{ title: 'Rules', description: text.trim() }]
  }
  return blocks
}

type Tab = 'rules' | 'kb'

export default function HouseRulesPanel({
  rules,
  knowledgeBase,
}: {
  rules: string | null
  knowledgeBase: string | null
}) {
  const [activeTab, setActiveTab] = useState<Tab>('rules')
  const [rulesSearch, setRulesSearch] = useState('')
  const [kbSearch, setKbSearch] = useState('')

  const rulesBlocks = useMemo(() => parseToBlocks(rules), [rules])
  const kbBlocks    = useMemo(() => parseToBlocks(knowledgeBase), [knowledgeBase])

  const filteredRules = useMemo(() => {
    if (!rulesSearch.trim()) return rulesBlocks
    const q = rulesSearch.toLowerCase()
    return rulesBlocks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    )
  }, [rulesBlocks, rulesSearch])

  const filteredKb = useMemo(() => {
    if (!kbSearch.trim()) return kbBlocks
    const q = kbSearch.toLowerCase()
    return kbBlocks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    )
  }, [kbBlocks, kbSearch])

  const currentSearch    = activeTab === 'rules' ? rulesSearch : kbSearch
  const setCurrentSearch = activeTab === 'rules' ? setRulesSearch : setKbSearch
  const currentBlocks    = activeTab === 'rules' ? filteredRules : filteredKb

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Outer tabs */}
      <div className="flex border-b border-[#E0DBD4]">
        {(['rules', 'kb'] as Tab[]).map((tab) => {
          const label    = tab === 'rules' ? 'House Rules' : 'Knowledge Base'
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? 'text-mvr-primary border-b-2 border-mvr-primary -mb-px bg-white'
                  : 'text-muted-foreground hover:text-mvr-primary hover:bg-mvr-cream'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[#E0DBD4]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={currentSearch}
            onChange={(e) => setCurrentSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#E0DBD4] rounded-lg focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
          />
        </div>
      </div>

      {/* Content blocks */}
      <div className="p-4 space-y-3 min-h-[100px]">
        {currentBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {currentSearch.trim() ? 'No matches.' : 'Nothing on file.'}
          </p>
        ) : (
          currentBlocks.map((block, i) => (
            <div key={i} className="space-y-1 pb-3 border-b border-[#E0DBD4] last:border-0 last:pb-0">
              <p className="text-xs font-semibold text-mvr-primary">{block.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {block.description}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
