'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, GripVertical, Trash2, X, Pencil, Download } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ContentBlock {
  id: string
  title: string
  description: string
  section: 'rules' | 'kb'
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function parseToBlocks(text: string | null, defaultSection: 'rules' | 'kb' = 'kb'): ContentBlock[] {
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return (parsed as Array<{ id?: string; title: string; description: string; section?: string }>).map((b) => ({
        id:          b.id ?? genId(),
        title:       b.title ?? '',
        description: b.description ?? '',
        section:     (b.section === 'rules' || b.section === 'kb') ? b.section : defaultSection,
      }))
    }
  } catch {}
  return parseLegacyText(text, defaultSection)
}

function parseLegacyText(text: string, defaultSection: 'rules' | 'kb' = 'kb'): ContentBlock[] {
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
      if (desc) blocks.push({ id: genId(), title: currentTitle, description: desc, section: defaultSection })
    }
  }

  for (const line of lines) {
    const heading = detectHeading(line)
    if (heading) { flush(); currentTitle = heading; currentLines = [] }
    else currentLines.push(line)
  }
  flush()

  if (blocks.length === 0 && text.trim()) {
    return [{ id: genId(), title: 'Content', description: text.trim(), section: defaultSection }]
  }
  return blocks
}

// ── PDF export ───────────────────────────────────────────────────────────────

async function downloadPdf(
  rulesBlocks: ContentBlock[],
  kbBlocks:    ContentBlock[],
  buildingName: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc    = new jsPDF()
  const pw     = doc.internal.pageSize.getWidth()
  const ph     = doc.internal.pageSize.getHeight()
  const margin = 18
  const cw     = pw - margin * 2

  // ── Header band (first page) ───────────────────────────────────────────────
  doc.setFillColor(30, 45, 64)
  doc.rect(0, 0, pw, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('MVR Operations Hub', margin, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(buildingName, margin, 23)
  doc.text('House Rules & Knowledge Base', pw - margin, 23, { align: 'right' })

  let y = 44

  // ── Renders one section; returns the updated y position ───────────────────
  function renderSection(label: string, blocks: ContentBlock[]) {
    // Section heading
    if (y + 20 > ph - 24) { doc.addPage(); y = 20 }

    doc.setFillColor(30, 45, 64)
    doc.rect(margin, y, cw, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin + 4, y + 7)
    y += 16

    if (blocks.length === 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(160, 160, 160)
      doc.text('No entries.', margin + 9, y)
      y += 12
      return
    }

    for (let i = 0; i < blocks.length; i++) {
      const block     = blocks[i]
      const descLines = doc.splitTextToSize(block.description || '', cw - 9)
      const blockH    = 8 + (descLines.length > 0 ? descLines.length * 5 : 0) + 10

      if (y + blockH > ph - 24) { doc.addPage(); y = 20 }

      // Number badge
      doc.setFillColor(232, 238, 244)
      doc.roundedRect(margin, y - 4, 6, 6, 1, 1, 'F')
      doc.setTextColor(30, 45, 64)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(String(i + 1), margin + 3, y + 0.5, { align: 'center' })

      // Title
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 45, 64)
      doc.text(block.title, margin + 9, y)
      y += 6

      // Description
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90, 90, 90)
      if (descLines.length > 0) {
        doc.text(descLines, margin + 9, y)
        y += descLines.length * 5
      }

      // Divider between blocks
      if (i < blocks.length - 1) {
        y += 5
        doc.setDrawColor(235, 240, 244)
        doc.line(margin, y, pw - margin, y)
        y += 7
      } else {
        y += 10
      }
    }
  }

  renderSection('House Rules', rulesBlocks)
  // Gap between sections
  y += 4
  renderSection('Knowledge Base', kbBlocks)

  // ── Footer on every page ───────────────────────────────────────────────────
  const total = doc.getNumberOfPages()
  const date  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5)
    doc.setTextColor(180, 180, 180)
    doc.text(`Generated ${date} · MVR Operations Hub`, margin, ph - 8)
    doc.text(`${p} / ${total}`, pw - margin, ph - 8, { align: 'right' })
  }

  doc.save(`${buildingName} - House Rules & Knowledge Base.pdf`)
}

// ── Sortable block ───────────────────────────────────────────────────────────

function SortableBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: ContentBlock
  onEdit: (block: ContentBlock) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className="group flex items-start gap-2 rounded-lg border border-[#E0DBD4] bg-white p-3 hover:border-mvr-primary/30 hover:shadow-sm transition-all duration-150"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-mvr-primary mb-1">{block.title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
          {block.description}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(block)}
          className="text-muted-foreground hover:text-mvr-primary transition-colors"
          aria-label="Edit block"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="text-muted-foreground hover:text-mvr-danger transition-colors"
          aria-label="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function StaticBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: ContentBlock
  onEdit: (block: ContentBlock) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-[#E0DBD4] bg-white p-3 hover:border-mvr-primary/30 hover:shadow-sm transition-all duration-150">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-mvr-primary mb-1">{block.title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
          {block.description}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(block)}
          className="text-muted-foreground hover:text-mvr-primary transition-colors"
          aria-label="Edit block"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="text-muted-foreground hover:text-mvr-danger transition-colors"
          aria-label="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

type Tab = 'rules' | 'kb'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function HouseRulesPanel({
  buildingId,
  buildingName,
  knowledgeBase,
}: {
  buildingId:    string
  buildingName:  string
  knowledgeBase: string | null
}) {
  const [activeTab, setActiveTab] = useState<Tab>('rules')

  const allBlocks = parseToBlocks(knowledgeBase)
  const [rulesBlocks, setRulesBlocks] = useState<ContentBlock[]>(() => allBlocks.filter(b => b.section === 'rules'))
  const [kbBlocks,    setKbBlocks]    = useState<ContentBlock[]>(() => allBlocks.filter(b => b.section === 'kb'))
  const [search,      setSearch]      = useState('')
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>('idle')

  // Modal state — null editingId = add mode; string = edit mode
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDesc,  setDraftDesc]  = useState('')

  const [downloading, setDownloading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const blocks    = activeTab === 'rules' ? rulesBlocks : kbBlocks
  const setBlocks = activeTab === 'rules' ? setRulesBlocks : setKbBlocks

  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return blocks
    const q = search.toLowerCase()
    return blocks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    )
  }, [blocks, search])

  const persist = useCallback(
    async (rules: ContentBlock[], kb: ContentBlock[]) => {
      const combined = [
        ...rules.map(b => ({ ...b, section: 'rules' as const })),
        ...kb.map(b => ({ ...b, section: 'kb' as const })),
      ]
      setSaveStatus('saving')
      try {
        const res = await fetch(`/api/v1/buildings/${buildingId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ knowledgeBase: JSON.stringify(combined) }),
        })
        if (!res.ok) throw new Error()
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    },
    [buildingId]
  )

  function mutate(updated: ContentBlock[]) {
    const nextRules = activeTab === 'rules' ? updated : rulesBlocks
    const nextKb    = activeTab === 'kb'    ? updated : kbBlocks
    setBlocks(updated)
    persist(nextRules, nextKb)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    mutate(arrayMove(blocks, oldIdx, newIdx))
  }

  function handleDelete(id: string) {
    mutate(blocks.filter((b) => b.id !== id))
  }

  function openAdd() {
    setEditingId(null)
    setDraftTitle('')
    setDraftDesc('')
    setModalOpen(true)
  }

  function openEdit(block: ContentBlock) {
    setEditingId(block.id)
    setDraftTitle(block.title)
    setDraftDesc(block.description)
    setModalOpen(true)
  }

  function handleSave() {
    if (!draftTitle.trim()) return
    if (editingId !== null) {
      // Edit mode — update in place
      mutate(
        blocks.map((b) =>
          b.id === editingId
            ? { ...b, title: draftTitle.trim(), description: draftDesc.trim() }
            : b
        )
      )
    } else {
      // Add mode — append with current tab's section
      mutate([
        ...blocks,
        { id: genId(), title: draftTitle.trim(), description: draftDesc.trim(), section: activeTab === 'rules' ? 'rules' : 'kb' },
      ])
      setSearch('')
    }
    setModalOpen(false)
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadPdf(rulesBlocks, kbBlocks, buildingName)
    } finally {
      setDownloading(false)
    }
  }

  const tabLabel = (t: Tab) => (t === 'rules' ? 'House Rules' : 'Knowledge Base')
  const isEditing = editingId !== null

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Tabs + actions */}
        <div className="flex items-stretch border-b border-[#E0DBD4]">
          {(['rules', 'kb'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearch('') }}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  isActive
                    ? 'text-mvr-primary border-b-2 border-mvr-primary -mb-px bg-white'
                    : 'text-muted-foreground hover:text-mvr-primary hover:bg-mvr-cream'
                }`}
              >
                {tabLabel(tab)}
              </button>
            )
          })}

          {/* Right controls */}
          <div className="flex items-center gap-1.5 px-3 border-l border-[#E0DBD4] shrink-0">
            {saveStatus === 'saving' && (
              <span className="text-[10px] text-muted-foreground">Saving…</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[10px] text-mvr-success">Saved ✓</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-[10px] text-mvr-danger">Error</span>
            )}
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading || (rulesBlocks.length === 0 && kbBlocks.length === 0)}
              className="flex items-center justify-center w-7 h-7 rounded-full border border-[#E0DBD4] text-muted-foreground hover:text-mvr-primary hover:border-mvr-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Download House Rules & Knowledge Base as PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {/* Add */}
            <button
              onClick={openAdd}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-mvr-primary text-white hover:bg-mvr-primary/90 active:scale-95 transition-all"
              title={`Add ${tabLabel(activeTab)} block`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#E0DBD4]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#E0DBD4] rounded-lg focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            />
          </div>
        </div>

        {/* Blocks list */}
        <div className="p-4 space-y-2 min-h-[100px]">
          {filteredBlocks.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                {search.trim() ? 'No matches.' : 'No blocks yet.'}
              </p>
              {!search.trim() && (
                <button
                  onClick={openAdd}
                  className="text-xs text-mvr-primary hover:underline font-medium"
                >
                  + Add the first block
                </button>
              )}
            </div>
          ) : search.trim() ? (
            filteredBlocks.map((block) => (
              <StaticBlock
                key={block.id}
                block={block}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredBlocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredBlocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0DBD4]">
              <h3 className="text-sm font-semibold text-mvr-primary">
                {isEditing
                  ? `Edit ${tabLabel(activeTab)} Block`
                  : activeTab === 'rules' ? 'Add House Rule' : 'Add Knowledge Base Entry'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-mvr-primary mb-1.5">
                  Title <span className="text-mvr-danger">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }}
                  placeholder={activeTab === 'rules' ? 'e.g. No Smoking' : 'e.g. Check-in Process'}
                  className="w-full px-3 py-2 text-sm border border-[#E0DBD4] rounded-lg focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mvr-primary mb-1.5">
                  Description
                </label>
                <textarea
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="Describe this rule or entry in detail…"
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-[#E0DBD4] rounded-lg focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary resize-y min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#E0DBD4] bg-mvr-cream/40">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-mvr-neutral"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!draftTitle.trim()}
                className="px-4 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isEditing ? 'Update Block' : 'Save Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
