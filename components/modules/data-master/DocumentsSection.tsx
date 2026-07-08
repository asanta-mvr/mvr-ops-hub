'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, FolderOpen, FolderPlus, Trash2, X, Upload, Bell, BellPlus,
  Hash, Mail, CalendarClock, RefreshCw, ChevronDown, ChevronRight, Pencil, Send,
  Bold, Italic, Braces,
} from 'lucide-react'
import { getDriveFolderId } from '@/lib/image-utils'
import { VARIABLE_GROUPS } from '@/lib/alerts/variables'

// ── Props (shaped by the server component) ──────────────────────────────────────

export interface DocTarget {
  ownerId?: string
  unitId?: string
}

export interface FolderView {
  id: string // DocumentFolder id
  name: string
  driveFolderId: string
}

export interface AlertTypeView {
  id: string
  name: string
  leadTimeDays: number[]
  sendHour: number
  notifyInternal: boolean
  slackChannel: string | null
  slackChannelId: string | null
  slackTemplate: string | null
  notifyOwner: boolean
  emailSubject: string | null
  emailTemplate: string | null
}

export interface FileAlertView {
  id: string
  driveFileId: string
  fileName: string
  expirationDate: string // ISO
  folderId: string
  folderName: string | null
  alertType: AlertTypeView
}

interface Props {
  target: DocTarget
  folders: FolderView[]
  fileAlerts: FileAlertView[]
  alertTypes: AlertTypeView[]
  canEdit: boolean
}

// ── Drive file helpers (mirrors the Drive list view) ────────────────────────────

interface FolderFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  size: number | null
}

interface SlackChannelOption {
  slackChannelId: string
  name: string
  isPrivate: boolean
}

function fmtModified(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ISO timestamp → yyyy-mm-dd for <input type="date"> (alerts store expiry at UTC midnight).
function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

// UTC-safe whole-day difference (matches lib/owners/documentStatus daysUntil).
function daysUntil(iso: string): number {
  const d = new Date(iso)
  const MS = 86_400_000
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const now = new Date()
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((a - b) / MS)
}

function daysLeftBadge(iso: string): { label: string; className: string } {
  const n = daysUntil(iso)
  if (n < 0) return { label: `Expired ${-n}d ago`, className: 'bg-mvr-danger-light text-mvr-danger' }
  if (n <= 30) return { label: `${n}d left`, className: 'bg-mvr-warning-light text-mvr-warning' }
  return { label: `${n}d left`, className: 'bg-mvr-success-light text-mvr-success' }
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.match(/\.([A-Za-z0-9]+)$/)?.[1]?.toUpperCase() ?? ''
  if (ext === 'PDF') {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded bg-mvr-danger text-white text-[8px] font-bold w-6 h-6">
        PDF
      </span>
    )
  }
  return <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
}

function routingSummary(t: AlertTypeView): string {
  const parts: string[] = []
  if (t.notifyInternal) parts.push(`Slack${t.slackChannel ? ` ${t.slackChannel}` : ''}`)
  if (t.notifyOwner) parts.push('Owner email')
  return parts.join(' + ') || '—'
}

// ── Message composer ────────────────────────────────────────────────────────────
// A template input/textarea with an attached toolbar: bold / italic (Slack-style
// *…* / _…_, which the email renderer also honors) and a Variables dropdown that
// inserts {{tokens}} at the cursor.

function TemplateField({
  value, onChange, placeholder, rows, multiline = true, allowFormat = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  multiline?: boolean
  allowFormat?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [showVars, setShowVars] = useState(false)

  function apply(transform: (val: string, start: number, end: number) => { next: string; caret: number }) {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const { next, caret } = transform(value, start, end)
    onChange(next)
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(caret, caret) } })
  }

  const wrap = (marker: string) =>
    apply((val, s, e) => {
      const sel = val.slice(s, e)
      const next = val.slice(0, s) + marker + sel + marker + val.slice(e)
      return { next, caret: sel ? e + marker.length * 2 : s + marker.length }
    })

  const insert = (token: string) => {
    const snippet = `{{${token}}}`
    apply((val, s) => ({ next: val.slice(0, s) + snippet + val.slice(s), caret: s + snippet.length }))
    setShowVars(false)
  }

  return (
    <div className="rounded-lg border border-[#E0DBD4] bg-white focus-within:ring-2 focus-within:ring-mvr-primary/30 focus-within:border-mvr-primary">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows ?? 3}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none resize-y"
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none"
        />
      )}
      <div className="relative flex items-center gap-1 border-t border-[#E0DBD4] px-2 py-1">
        {allowFormat && (
          <>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => wrap('*')}
              title="Bold" className="p-1 rounded text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => wrap('_')}
              title="Italic" className="p-1 rounded text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-[#E0DBD4]" />
          </>
        )}
        <button type="button" onClick={() => setShowVars(v => !v)}
          className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light">
          <Braces className="w-3.5 h-3.5" /> Variables <ChevronDown className="w-3 h-3" />
        </button>
        {showVars && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowVars(false)} />
            <div className="absolute bottom-full left-0 z-20 mb-1 w-72 max-h-64 overflow-y-auto rounded-lg border border-[#E0DBD4] bg-white shadow-panel p-2 space-y-2">
              {VARIABLE_GROUPS.map(g => (
                <div key={g.key}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mvr-sand mb-1">{g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.variables.map(v => (
                      <button key={v.token} type="button" onClick={() => insert(v.token)}
                        title={`{{${v.token}}} — e.g. ${v.example}`}
                        className="px-2 py-0.5 rounded-full text-[11px] bg-mvr-neutral/60 text-foreground hover:bg-mvr-primary-light hover:text-mvr-primary transition-colors">
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────────

export function DocumentsSection({ target, folders, fileAlerts, alertTypes, canEdit }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [saEmail, setSaEmail] = useState<string | null>(null)
  const [filesByFolder, setFilesByFolder] = useState<Record<string, FolderFile[]>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [slackChannels, setSlackChannels] = useState<SlackChannelOption[]>([])

  // Add-folder form
  const [addingFolder, setAddingFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderUrl, setFolderUrl] = useState('')
  const [nameEdited, setNameEdited] = useState(false) // user typed a custom name?
  const [fetchingName, setFetchingName] = useState(false)

  // New/edit alert-type form
  const [addingType, setAddingType] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [typeName, setTypeName] = useState('')
  const [typeOffsets, setTypeOffsets] = useState<number[]>([60, 30, 7]) // days-before-expiry
  const [offsetValue, setOffsetValue] = useState('')
  const [offsetUnit, setOffsetUnit] = useState<'days' | 'weeks' | 'months'>('days')
  const [typeSendHour, setTypeSendHour] = useState(9)
  const [typeInternal, setTypeInternal] = useState(false)
  const [typeSlack, setTypeSlack] = useState('') // channel name (display)
  const [typeSlackId, setTypeSlackId] = useState('') // channel id (send target)
  const [typeSlackTemplate, setTypeSlackTemplate] = useState('')
  const [typeOwner, setTypeOwner] = useState(false)
  const [typeEmailSubject, setTypeEmailSubject] = useState('')
  const [typeEmailTemplate, setTypeEmailTemplate] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; msg: string } | null>(null)

  // Per-file bulk selection + expiry drafts: key = `${folderId}:${driveFileId}`
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [expiries, setExpiries] = useState<Record<string, string>>({})
  // Bulk apply bar
  const [bulkTypeId, setBulkTypeId] = useState('')
  const [bulkExpiry, setBulkExpiry] = useState('')

  // Service-account email — the account a folder must be shared with (Editor).
  useEffect(() => {
    let active = true
    fetch('/api/v1/drive/service-account')
      .then(r => (r.ok ? r.json() : { data: {} }))
      .then((j: { data?: { email?: string | null } }) => { if (active) setSaEmail(j.data?.email ?? null) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Slack channels (synced mirror) — powers the internal-notification channel picker.
  useEffect(() => {
    let active = true
    fetch('/api/v1/integrations/slack/channels?pageSize=200&includeArchived=false')
      .then(r => (r.ok ? r.json() : { data: { rows: [] } }))
      .then((j: { data?: { rows?: SlackChannelOption[] } }) => {
        if (active) setSlackChannels(j.data?.rows ?? [])
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Load the files inside each linked folder (Drive list preview + apply picker).
  const folderKey = folders.map(f => f.driveFolderId).join(',')

  const loadFolderFiles = useCallback(async (): Promise<Record<string, FolderFile[]>> => {
    const entries = await Promise.all(
      folders.map(async f => {
        try {
          const r = await fetch(`/api/v1/drive/folder/${f.driveFolderId}`, { cache: 'no-store' })
          const j: { data?: FolderFile[] } = r.ok ? await r.json() : { data: [] }
          return [f.id, j.data ?? []] as const
        } catch {
          return [f.id, [] as FolderFile[]] as const
        }
      })
    )
    return Object.fromEntries(entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderKey])

  useEffect(() => {
    let active = true
    loadFolderFiles().then(map => { if (active) setFilesByFolder(map) })
    return () => { active = false }
  }, [loadFolderFiles])

  const targetBody = target.ownerId ? { ownerId: target.ownerId } : { unitId: target.unitId }

  // For the header expand/collapse-all toggle.
  const allCollapsed = folders.length > 0 && folders.every(f => collapsed[f.id])

  // Index alerts by file (`${folderId}:${driveFileId}`) so each file row shows
  // its own alerts. A file may carry several; they share one expiry date.
  const alertsByFile: Record<string, FileAlertView[]> = {}
  for (const a of fileAlerts) {
    const k = `${a.folderId}:${a.driveFileId}`
    ;(alertsByFile[k] ??= []).push(a)
  }

  const fail = useCallback((e: unknown, fallback: string) => {
    setError(e instanceof Error ? e.message : fallback)
  }, [])

  // Re-pull the latest file listings from Google Drive (picks up files added
  // or removed directly in Drive since this page loaded).
  async function refreshFolders() {
    setRefreshing(true); setError(null)
    try {
      setFilesByFolder(await loadFolderFiles())
    } catch (e) {
      fail(e, 'Failed to refresh from Drive')
    } finally {
      setRefreshing(false)
    }
  }

  // Pre-fill the folder name from the pasted Drive link (unless the user already
  // typed their own name). Called when the URL field loses focus.
  async function prefillName() {
    const id = getDriveFolderId(folderUrl.trim())
    if (!id || nameEdited || folderName.trim()) return
    setFetchingName(true)
    try {
      const r = await fetch(`/api/v1/drive/folder/${id}/meta`)
      const j: { data?: { name?: string | null } } = r.ok ? await r.json() : {}
      const name = j.data?.name
      if (name && !nameEdited && !folderName.trim()) setFolderName(name)
    } catch {
      /* best-effort — leave the field for manual entry */
    } finally {
      setFetchingName(false)
    }
  }

  async function addFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!folderName.trim() || !folderUrl.trim()) { setError('Enter a folder name and a Drive link.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/v1/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim(), folderUrl: folderUrl.trim(), ...targetBody }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to add folder')
      setFolderName(''); setFolderUrl(''); setNameEdited(false); setAddingFolder(false); router.refresh()
    } catch (e) { fail(e, 'Failed to add folder') } finally { setBusy(false) }
  }

  async function removeFolder(id: string, name: string) {
    if (!confirm(`Remove the folder "${name}"? Its alerts are removed too. The Drive files are untouched.`)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/v1/documents/folders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to remove folder')
      router.refresh()
    } catch (e) { fail(e, 'Failed to remove folder') } finally { setBusy(false) }
  }

  async function uploadInto(folderId: string, file: File) {
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/v1/documents/folders/${folderId}/upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Upload failed')
      // Re-fetch just this folder's files.
      const folder = folders.find(f => f.id === folderId)
      if (folder) {
        const r = await fetch(`/api/v1/drive/folder/${folder.driveFolderId}`)
        const j: { data?: FolderFile[] } = r.ok ? await r.json() : { data: [] }
        setFilesByFolder(prev => ({ ...prev, [folderId]: j.data ?? [] }))
      }
    } catch (e) { fail(e, 'Upload failed') } finally { setBusy(false) }
  }

  function resetTypeForm() {
    setTypeName(''); setTypeOffsets([60, 30, 7]); setOffsetValue(''); setOffsetUnit('days'); setTypeSendHour(9)
    setTypeInternal(false); setTypeSlack(''); setTypeSlackId(''); setTypeSlackTemplate('')
    setTypeOwner(false); setTypeEmailSubject(''); setTypeEmailTemplate('')
    setEditingTypeId(null)
  }

  // Toggle the New/edit alert-type form. Opening it fresh clears any edit state.
  function toggleAddType() {
    setError(null)
    if (addingType) { setAddingType(false); resetTypeForm() }
    else { resetTypeForm(); setAddingType(true) }
  }

  // Load an existing alert type into the form for editing.
  function startEditType(t: AlertTypeView) {
    setTypeName(t.name)
    setTypeOffsets([...t.leadTimeDays].sort((a, b) => b - a))
    setOffsetValue(''); setOffsetUnit('days')
    setTypeSendHour(t.sendHour)
    setTypeInternal(t.notifyInternal)
    setTypeSlack(t.slackChannel ?? '')
    setTypeSlackId(t.slackChannelId ?? '')
    setTypeSlackTemplate(t.slackTemplate ?? '')
    setTypeOwner(t.notifyOwner)
    setTypeEmailSubject(t.emailSubject ?? '')
    setTypeEmailTemplate(t.emailTemplate ?? '')
    setEditingTypeId(t.id)
    setAddingType(true)
    setError(null)
  }

  // Add a lead-time offset (converting weeks/months to days), dedup + sort desc.
  function addOffset() {
    const n = parseInt(offsetValue.trim(), 10)
    if (!Number.isFinite(n) || n <= 0) return
    const days = offsetUnit === 'weeks' ? n * 7 : offsetUnit === 'months' ? n * 30 : n
    setTypeOffsets(prev => Array.from(new Set([...prev, days])).sort((a, b) => b - a))
    setOffsetValue('')
  }

  function removeOffset(day: number) {
    setTypeOffsets(prev => prev.filter(d => d !== day))
  }

  async function saveAlertType(e: React.FormEvent) {
    e.preventDefault()
    if (!typeName.trim()) { setError('Name the alert type.'); return }
    if (typeOffsets.length === 0) { setError('Add at least one reminder offset.'); return }
    if (!typeInternal && !typeOwner) { setError('Choose internal (Slack), external (owner email), or both.'); return }
    if (typeInternal && !typeSlack.trim()) { setError('Choose a Slack channel for internal notifications.'); return }
    if (typeInternal && !typeSlackTemplate.trim()) { setError('Write the Slack message for internal notifications.'); return }
    if (typeOwner && !typeEmailSubject.trim()) { setError('Write the email subject for external notifications.'); return }
    if (typeOwner && !typeEmailTemplate.trim()) { setError('Write the email body for external notifications.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(editingTypeId ? `/api/v1/alert-types/${editingTypeId}` : '/api/v1/alert-types', {
        method: editingTypeId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeName.trim(),
          leadTimeDays: typeOffsets,
          sendHour: typeSendHour,
          notifyInternal: typeInternal,
          slackChannel: typeInternal ? typeSlack.trim() : null,
          slackChannelId: typeInternal ? (typeSlackId || null) : null,
          slackTemplate: typeInternal ? typeSlackTemplate : null,
          notifyOwner: typeOwner,
          emailSubject: typeOwner ? typeEmailSubject : null,
          emailTemplate: typeOwner ? typeEmailTemplate : null,
        }),
      })
      if (!res.ok) {
        // Stale page cache: the type was removed server-side. Re-sync the list.
        if (res.status === 404) {
          setError('This alert type no longer exists — refreshing the list. Please try again.')
          resetTypeForm(); setAddingType(false); router.refresh()
          return
        }
        throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to save alert type')
      }
      resetTypeForm(); setAddingType(false); router.refresh()
    } catch (e) { fail(e, 'Failed to save alert type') } finally { setBusy(false) }
  }

  async function deleteAlertType(id: string, name: string) {
    if (!confirm(`Delete the alert type "${name}"?`)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/v1/alert-types/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to delete alert type')
      router.refresh()
    } catch (e) { fail(e, 'Failed to delete alert type') } finally { setBusy(false) }
  }

  // Send a real, rendered test of this alert type using the current entity's owner.
  async function testAlertType(id: string) {
    setTestingId(id); setTestResult(null); setError(null)
    try {
      const res = await fetch(`/api/v1/alert-types/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetBody),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error ?? 'Test failed')
      const parts: string[] = []
      if (j?.data?.slack) parts.push(`Slack: ${j.data.slack.sent ? '✓ ' : '✗ '}${j.data.slack.detail}`)
      if (j?.data?.email) parts.push(`Email: ${j.data.email.sent ? '✓ ' : '✗ '}${j.data.email.detail}`)
      setTestResult({ id, msg: parts.join('  ·  ') || 'Nothing to send (no channel enabled).' })
    } catch (e) {
      setTestResult({ id, msg: e instanceof Error ? e.message : 'Test failed' })
    } finally { setTestingId(null) }
  }

  function toggleSelect(key: string) {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedKeys = Object.keys(selected).filter(k => selected[k])

  // Attach an alert type to one file (needs an expiry date).
  async function addAlertToFile(folderId: string, file: FolderFile, alertTypeId: string, expiry: string) {
    if (!expiry) { setError('Set an expiry date for this file first.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/v1/file-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, driveFileId: file.id, fileName: file.name, expirationDate: expiry, alertTypeId, ...targetBody }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to add alert')
      router.refresh()
    } catch (e) { fail(e, 'Failed to add alert') } finally { setBusy(false) }
  }

  // Update a file's shared expiry by patching each of its alerts.
  async function commitExpiry(alerts: FileAlertView[], expiry: string) {
    if (!expiry || alerts.length === 0) return
    if (alerts.every(a => isoToDateInput(a.expirationDate) === expiry)) return // unchanged
    setBusy(true); setError(null)
    try {
      const results = await Promise.all(alerts.map(a =>
        fetch(`/api/v1/file-alerts/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expirationDate: expiry }),
        })
      ))
      if (results.some(r => !r.ok)) throw new Error('Failed to update expiry')
      router.refresh()
    } catch (e) { fail(e, 'Failed to update expiry') } finally { setBusy(false) }
  }

  async function removeAlert(id: string) {
    if (!confirm('Remove this renewal alert?')) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/v1/file-alerts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to remove alert')
      router.refresh()
    } catch (e) { fail(e, 'Failed to remove alert') } finally { setBusy(false) }
  }

  // Bulk: apply one alert type + expiry to every checked file.
  async function applyBulk() {
    if (!bulkTypeId) { setError('Pick an alert type to apply.'); return }
    if (!bulkExpiry) { setError('Set an expiry date to apply.'); return }
    if (selectedKeys.length === 0) { setError('Select at least one file.'); return }
    const items = selectedKeys.map(key => {
      const [folderId, driveFileId] = key.split(':')
      const file = (filesByFolder[folderId] ?? []).find(f => f.id === driveFileId)
      return { folderId, driveFileId, fileName: file?.name ?? driveFileId, expirationDate: bulkExpiry, alertTypeId: bulkTypeId, ...targetBody }
    })
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/v1/file-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to apply alerts')
      setSelected({}); setBulkTypeId(''); setBulkExpiry(''); router.refresh()
    } catch (e) { fail(e, 'Failed to apply alerts') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-mvr-danger-light text-mvr-danger px-3 py-2 text-xs font-medium">{error}</div>
      )}

      {/* ── Documents card ── */}
      <div className="bg-white rounded-xl border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E0DBD4] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Documents
          </h2>
          {folders.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapsed(allCollapsed ? {} : Object.fromEntries(folders.map(f => [f.id, true])))}
              className="shrink-0 text-muted-foreground hover:text-mvr-primary"
              title={allCollapsed ? 'Expand all folders' : 'Collapse all folders'}
            >
              {allCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshFolders}
            disabled={refreshing || folders.length === 0}
            title="Refresh files from Google Drive"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-mvr-primary/30 text-mvr-primary rounded-lg hover:bg-mvr-primary-light disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canEdit && (
            <button
              onClick={() => { setAddingFolder(v => !v); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 transition-colors"
            >
              {addingFolder ? <X className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
              {addingFolder ? 'Cancel' : 'Add folder'}
            </button>
          )}
        </div>
      </div>

      {/* Add-folder form */}
      {addingFolder && canEdit && (
        <form onSubmit={addFolder} className="px-5 py-4 border-b border-[#E0DBD4] bg-mvr-cream/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
            <label className="text-xs text-muted-foreground">
              Folder name{fetchingName && <span className="ml-1 text-muted-foreground/70">· fetching…</span>}
              <input value={folderName}
                onChange={e => { setFolderName(e.target.value); setNameEdited(true) }}
                placeholder="Auto-fills from the link — or type your own"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
            </label>
            <label className="text-xs text-muted-foreground">
              Google Drive folder link
              <input value={folderUrl}
                onChange={e => setFolderUrl(e.target.value)}
                onBlur={prefillName}
                placeholder="https://drive.google.com/drive/folders/…"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
            </label>
          </div>
          {saEmail && (
            <p className="text-[11px] text-muted-foreground">
              Share the folder with <span className="font-mono text-mvr-olive">{saEmail}</span> as <strong>Editor</strong> so the app can upload &amp; preview files.
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={busy}
              className="px-4 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors">
              {busy ? 'Saving…' : 'Add folder'}
            </button>
          </div>
        </form>
      )}

      {/* Folders */}
      {folders.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground italic">
          No folders yet. {canEdit ? 'Add a Drive folder to get started.' : ''}
        </div>
      ) : (
        <div className="divide-y divide-[#E0DBD4]">
          {folders.map(folder => {
            const files = filesByFolder[folder.id] ?? []
            const isCollapsed = !!collapsed[folder.id]
            return (
              <div key={folder.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setCollapsed(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                      className="flex items-center gap-2 min-w-0 text-left group"
                      title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                    >
                      {isCollapsed
                        ? <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-mvr-primary" />
                        : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-mvr-primary" />}
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-mvr-primary">{folder.name}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">({files.length})</span>
                    </button>
                    <a href={`https://drive.google.com/drive/folders/${folder.driveFolderId}`} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-mvr-primary" title="Open Drive folder">
                      <FolderOpen className="w-4 h-4" />
                    </a>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-mvr-primary/30 text-mvr-primary rounded-lg hover:bg-mvr-primary-light cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                        <input type="file" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadInto(folder.id, f); e.target.value = '' }} />
                      </label>
                      <button onClick={() => removeFolder(folder.id, folder.name)}
                        className="text-muted-foreground hover:text-mvr-danger" title="Remove folder">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  files.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No files found.{saEmail ? ` Make sure the folder is shared with ${saEmail} as Editor.` : ''}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-[#E0DBD4]">
                            {canEdit && <th className="w-8 px-2 py-2" />}
                            <th className="font-medium px-2 py-2 text-left">Name</th>
                            <th className="font-medium px-2 py-2 text-center whitespace-nowrap w-36">Expires</th>
                            <th className="font-medium px-2 py-2 text-center whitespace-nowrap w-24">Status</th>
                            <th className="font-medium px-2 py-2 text-center whitespace-nowrap w-56">Alerts</th>
                            <th className="font-medium px-2 py-2 text-center hidden lg:table-cell whitespace-nowrap w-32">Date modified</th>
                            <th className="font-medium px-2 py-2 text-center hidden md:table-cell whitespace-nowrap w-20">Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0DBD4]">
                          {files.map(f => {
                            const key = `${folder.id}:${f.id}`
                            const alerts = alertsByFile[key] ?? []
                            const sharedIso = alerts[0]?.expirationDate ?? null
                            const expiryValue = expiries[key] ?? isoToDateInput(sharedIso)
                            const appliedTypeIds = new Set(alerts.map(a => a.alertType.id))
                            const available = alertTypes.filter(t => !appliedTypeIds.has(t.id))
                            const badge = sharedIso ? daysLeftBadge(sharedIso) : null
                            return (
                              <tr key={f.id} className="hover:bg-mvr-neutral/40 transition-colors align-top">
                                {canEdit && (
                                  <td className="px-2 py-2">
                                    <input type="checkbox" checked={!!selected[key]} onChange={() => toggleSelect(key)} className="rounded border-[#ccc]" />
                                  </td>
                                )}
                                <td className="px-2 py-2">
                                  <a href={`https://drive.google.com/file/d/${f.id}/view`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 min-w-0 text-foreground hover:text-mvr-primary">
                                    <FileTypeIcon name={f.name} />
                                    <span className="truncate">{f.name}</span>
                                  </a>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {canEdit ? (
                                    <input type="date" value={expiryValue}
                                      onChange={e => setExpiries(prev => ({ ...prev, [key]: e.target.value }))}
                                      onBlur={() => { if (alerts.length) commitExpiry(alerts, expiryValue) }}
                                      className="border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
                                  ) : (
                                    <span className="text-muted-foreground">{fmtDate(sharedIso)}</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {badge
                                    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                                    : <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex flex-wrap items-center justify-center gap-1">
                                    {alerts.map(a => (
                                      <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-mvr-neutral/60 text-foreground" title={`${a.alertType.leadTimeDays.join('/')}d · ${routingSummary(a.alertType)}`}>
                                        {a.alertType.name}
                                        {canEdit && (
                                          <button onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-mvr-danger" title="Remove alert">
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                    {canEdit && available.length > 0 && (
                                      <select value="" disabled={busy}
                                        onChange={e => { if (e.target.value) addAlertToFile(folder.id, f, e.target.value, expiryValue) }}
                                        className="border rounded-lg px-1.5 py-0.5 text-[11px] bg-white text-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary">
                                        <option value="">+ Add</option>
                                        {available.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                    )}
                                    {alerts.length === 0 && !(canEdit && available.length > 0) && (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-center text-muted-foreground hidden lg:table-cell whitespace-nowrap">{fmtModified(f.modifiedTime)}</td>
                                <td className="px-2 py-2 text-center text-muted-foreground hidden md:table-cell whitespace-nowrap">{fmtSize(f.size)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk apply bar — appears when files are checked */}
      {canEdit && selectedKeys.length > 0 && (
        <div className="border-t border-[#E0DBD4] bg-mvr-cream/60 px-5 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-mvr-primary flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> {selectedKeys.length} file{selectedKeys.length === 1 ? '' : 's'} selected — apply
          </span>
          <select value={bulkTypeId} onChange={e => setBulkTypeId(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary">
            <option value="">Choose alert type…</option>
            {alertTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={bulkExpiry} onChange={e => setBulkExpiry(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
          <button onClick={applyBulk} disabled={busy || !bulkTypeId || !bulkExpiry}
            className="px-3 py-1.5 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors">
            {busy ? 'Applying…' : `Apply to ${selectedKeys.length}`}
          </button>
          <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-mvr-primary">Clear</button>
          {alertTypes.length === 0 && <span className="text-xs text-mvr-warning">Create an alert type first.</span>}
        </div>
      )}

      </div>

      {/* ── Alert Types card ── */}
      <div className="bg-white rounded-xl border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E0DBD4] flex items-center justify-between gap-2">
          <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alert Types
          </h2>
          {canEdit && (
            <button onClick={toggleAddType}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-mvr-primary/30 text-mvr-primary rounded-lg hover:bg-mvr-primary-light transition-colors shrink-0">
              {addingType ? <X className="w-3.5 h-3.5" /> : <BellPlus className="w-3.5 h-3.5" />}
              {addingType ? 'Cancel' : 'New alert type'}
            </button>
          )}
        </div>

        <div className="px-5 py-4">
        {/* New/edit alert type */}
        {addingType && canEdit && (
          <form onSubmit={saveAlertType} className="mb-4 rounded-lg border border-[#E0DBD4] bg-mvr-cream/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-mvr-primary">{editingTypeId ? 'Edit alert type' : 'New alert type'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground">
                Name
                <input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="Standard renewal (60/30/7)"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
              </label>
              <label className="text-xs text-muted-foreground">
                Send time (ET)
                <select value={typeSendHour} onChange={e => setTypeSendHour(parseInt(e.target.value, 10))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {((h % 12) || 12)}:00 {h < 12 ? 'AM' : 'PM'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Reminder offsets before expiry */}
            <div className="text-xs text-muted-foreground">
              Reminders — before the document expires
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {typeOffsets.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white border border-[#E0DBD4] text-foreground">
                    {d} day{d === 1 ? '' : 's'} before
                    <button type="button" onClick={() => removeOffset(d)} className="text-muted-foreground hover:text-mvr-danger" title="Remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {typeOffsets.length === 0 && <span className="text-mvr-warning">Add at least one.</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min={1} value={offsetValue} onChange={e => setOffsetValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOffset() } }}
                  placeholder="30"
                  className="w-20 border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
                <select value={offsetUnit} onChange={e => setOffsetUnit(e.target.value as typeof offsetUnit)}
                  className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary">
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
                <span className="text-muted-foreground">before</span>
                <button type="button" onClick={addOffset}
                  className="px-2.5 py-1.5 text-xs font-medium border border-mvr-primary/30 text-mvr-primary rounded-lg hover:bg-mvr-primary-light transition-colors">
                  Add
                </button>
              </div>
            </div>

            {/* Routing + message templates */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={typeInternal} onChange={e => setTypeInternal(e.target.checked)} className="rounded border-[#ccc]" />
                <Hash className="w-4 h-4 text-mvr-primary" /> Internal — notify a Slack channel
              </label>
              {typeInternal && (
                <div className="ml-6 space-y-2">
                  {slackChannels.length > 0 ? (
                    <select value={typeSlackId}
                      onChange={e => {
                        const id = e.target.value
                        setTypeSlackId(id)
                        setTypeSlack(slackChannels.find(c => c.slackChannelId === id)?.name ?? '')
                      }}
                      className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary">
                      <option value="">Select a channel…</option>
                      {slackChannels.map(c => (
                        <option key={c.slackChannelId} value={c.slackChannelId}>
                          {c.isPrivate ? '🔒 ' : '# '}{c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={typeSlack} onChange={e => setTypeSlack(e.target.value)} placeholder="#ops-alerts"
                      className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
                  )}
                  <TemplateField value={typeSlackTemplate} onChange={setTypeSlackTemplate} rows={3} allowFormat
                    placeholder="Reminder: {{doc.fileName}} for {{owner.fullName}} expires {{doc.expirationDate}} ({{doc.daysUntilExpiry}} days)." />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={typeOwner} onChange={e => setTypeOwner(e.target.checked)} className="rounded border-[#ccc]" />
                <Mail className="w-4 h-4 text-mvr-primary" /> External — email the owner
              </label>
              {typeOwner && (
                <div className="ml-6 space-y-2">
                  <TemplateField value={typeEmailSubject} onChange={setTypeEmailSubject} multiline={false}
                    placeholder="Subject — e.g. Action needed: {{doc.fileName}} expires soon" />
                  <TemplateField value={typeEmailTemplate} onChange={setTypeEmailTemplate} rows={5} allowFormat
                    placeholder={'Hi {{owner.firstName}},\n\nYour document "{{doc.fileName}}" expires on {{doc.expirationDate}}. Please send us the renewal.\n\nThank you.'} />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={busy}
                className="px-4 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors">
                {busy ? 'Saving…' : editingTypeId ? 'Save changes' : 'Create alert type'}
              </button>
            </div>
          </form>
        )}

        {/* Existing alert types (chips with edit / test / delete) */}
        {alertTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No alert types yet.{canEdit ? ' Create one, then apply it to files in the Documents table above.' : ''}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-[#E0DBD4] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-[#E0DBD4] bg-mvr-cream">
                    <th className="font-medium px-3 py-2">Name</th>
                    <th className="font-medium px-3 py-2 whitespace-nowrap hidden sm:table-cell">Reminders</th>
                    <th className="font-medium px-3 py-2 whitespace-nowrap">Send time</th>
                    <th className="font-medium px-3 py-2">Routing</th>
                    {canEdit && <th className="px-3 py-2 w-24" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0DBD4]">
                  {alertTypes.map(t => (
                    <tr key={t.id} className="hover:bg-mvr-neutral/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {[...t.leadTimeDays].sort((a, b) => b - a).join('/')}d before
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {((t.sendHour % 12) || 12)}:00 {t.sendHour < 12 ? 'AM' : 'PM'} ET
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {t.notifyInternal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-mvr-primary-light text-mvr-primary">
                              <Hash className="w-3 h-3" />{t.slackChannel ?? 'Slack'}
                            </span>
                          )}
                          {t.notifyOwner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-mvr-success-light text-mvr-success">
                              <Mail className="w-3 h-3" />Owner email
                            </span>
                          )}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => testAlertType(t.id)} disabled={testingId === t.id}
                              className="text-muted-foreground hover:text-mvr-primary disabled:opacity-40" title="Send a test with this owner's data">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => startEditType(t)} className="text-muted-foreground hover:text-mvr-primary" title="Edit alert type">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteAlertType(t.id, t.name)} className="text-muted-foreground hover:text-mvr-danger" title="Delete alert type">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {testResult && (
              <p className="mt-3 text-xs text-muted-foreground bg-mvr-neutral/50 rounded-lg px-3 py-2">
                <span className="font-medium text-mvr-primary">Test:</span> {testResult.msg}
              </p>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
