'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, FileWarning, ExternalLink, Plus, Trash2, X, FolderOpen, FolderPlus, History } from 'lucide-react'
import type { DocStatus } from '@/lib/owners/documentStatus'

// ── Types (shaped by the server component) ──────────────────────────────────────

export interface DocTypeOption {
  key:       string
  label:     string
  scope:     'owner' | 'legal_owner' | 'unit'
  hasExpiry: boolean
  required:  boolean
}

export interface DocHistoryEntry {
  id:         string
  version:    number
  fileUrl:    string | null // signed for read
  issueDate:  string | null
  expireDate: string | null
}

export interface DocLineView {
  docId:      string | null // null = a required type with no current document (missing)
  typeKey:    string
  label:      string
  scope:      'owner' | 'legal_owner' | 'unit'
  unitId:     string | null
  unitNumber: string | null
  status:     DocStatus
  fileUrl:    string | null // signed for read
  issueDate:  string | null
  expireDate: string | null
  version:    number
}

// The entity this card manages — exactly one id is set.
export interface DocTarget {
  ownerId?:       string
  guestyOwnerId?: string
  unitId?:        string
}

interface Props {
  target:        DocTarget
  title?:        string
  docTypes:      DocTypeOption[]
  lines:         DocLineView[]
  history?:      Record<string, DocHistoryEntry[]> // prior versions keyed by typeKey
  canEdit:       boolean
  driveFolderId?: string | null
}

const STATUS_META: Record<DocStatus, { label: string; className: string }> = {
  valid:         { label: 'Valid',    className: 'bg-mvr-success-light text-mvr-success' },
  on_file:       { label: 'On file',  className: 'bg-mvr-success-light text-mvr-success' },
  expiring_soon: { label: 'Expiring', className: 'bg-mvr-warning-light text-mvr-warning' },
  expired:       { label: 'Expired',  className: 'bg-mvr-danger-light text-mvr-danger' },
  missing:       { label: 'Missing',  className: 'bg-mvr-danger-light text-mvr-danger' },
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface FolderFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  size: number | null
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

export function OwnerDocumentsCard({ target, title = 'Documents & Compliance', docTypes, lines, history = {}, canEdit, driveFolderId }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openHistory, setOpenHistory] = useState<string | null>(null)

  const [typeKey, setTypeKey] = useState('')
  const [expireDate, setExpireDate] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const folderUrl = driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : null
  const [editingFolder, setEditingFolder] = useState(false)
  const [folderInput, setFolderInput] = useState('')
  const [folderFiles, setFolderFiles] = useState<FolderFile[]>([])
  const [saEmail, setSaEmail] = useState<string | null>(null)

  // Service-account email — the account a folder must be shared with (Editor).
  useEffect(() => {
    let active = true
    fetch('/api/v1/drive/service-account')
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .then((j: { data?: { email?: string | null } }) => { if (active) setSaEmail(j.data?.email ?? null) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Preview the files already sitting in the linked Drive folder.
  useEffect(() => {
    if (!driveFolderId) { setFolderFiles([]); return }
    let active = true
    fetch(`/api/v1/drive/folder/${driveFolderId}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: FolderFile[] }) => {
        if (active) setFolderFiles(j.data ?? [])
      })
      .catch(() => {})
    return () => { active = false }
  }, [driveFolderId])

  const selectedType = docTypes.find(t => t.key === typeKey) ?? null

  function resetForm() {
    setTypeKey(''); setExpireDate(''); setIssueDate(''); setFile(null); setError(null)
  }

  async function saveFolder() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/v1/documents/folder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, folderUrl: folderInput.trim() || null }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        throw new Error(b?.error ?? 'Failed to save folder')
      }
      setEditingFolder(false); router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save folder')
    } finally {
      setBusy(false)
    }
  }

  function openAdd(prefillType?: string) {
    resetForm()
    if (prefillType) setTypeKey(prefillType)
    setAdding(true)
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!typeKey) { setError('Choose a document type.'); return }
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('typeKey', typeKey)
      if (target.ownerId) fd.append('ownerId', target.ownerId)
      if (target.guestyOwnerId) fd.append('guestyOwnerId', target.guestyOwnerId)
      if (target.unitId) fd.append('unitId', target.unitId)
      if (issueDate) fd.append('issueDate', issueDate)
      if (expireDate) fd.append('expireDate', expireDate)
      if (file) fd.append('file', file)

      const res = await fetch('/api/v1/documents', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to add document')
      }
      resetForm(); setAdding(false); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document')
    } finally {
      setBusy(false)
    }
  }

  async function removeDoc(docId: string, label: string) {
    if (!confirm(`Delete this ${label} version? This cannot be undone.`)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete document')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E0DBD4]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide truncate">
              {title}
            </h2>
            {folderUrl && (
              <a href={folderUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-mvr-primary" title="Open Drive folder">
                <FolderOpen className="w-4 h-4" />
              </a>
            )}
            {canEdit && (
              <button
                onClick={() => { setEditingFolder(v => !v); setFolderInput(folderUrl ?? '') }}
                className="shrink-0 text-muted-foreground hover:text-mvr-primary"
                title={folderUrl ? 'Change Drive folder' : 'Attach a Drive folder for uploads'}
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => (adding ? setAdding(false) : openAdd())}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 transition-colors shrink-0"
            >
              {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {adding ? 'Cancel' : 'Add'}
            </button>
          )}
        </div>

        {editingFolder && canEdit && (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={folderInput}
              onChange={e => setFolderInput(e.target.value)}
              placeholder="Paste the Google Drive folder link (…/drive/folders/…)"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
            />
            <button onClick={saveFolder} disabled={busy}
              className="px-3 py-1.5 text-xs font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setEditingFolder(false)} className="px-2 py-1.5 text-xs text-muted-foreground hover:text-mvr-primary">
              Cancel
            </button>
          </div>
        )}
        {editingFolder && canEdit && saEmail && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Share the folder with <span className="font-mono text-mvr-olive">{saEmail}</span> as <strong>Editor</strong> so the app can upload &amp; preview files.
          </p>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg bg-mvr-danger-light text-mvr-danger px-3 py-2 text-xs font-medium">{error}</div>
      )}

      {adding && canEdit && (
        <form onSubmit={submitNew} className="px-5 py-4 border-b border-[#E0DBD4] bg-mvr-cream/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Type
              <select
                value={typeKey}
                onChange={e => setTypeKey(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
              >
                <option value="">Select type…</option>
                {docTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            {selectedType?.hasExpiry && (
              <label className="text-xs text-muted-foreground">
                Expiration date
                <input type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
              </label>
            )}
            <label className="text-xs text-muted-foreground">
              Issue date (optional)
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary" />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Upload file
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-mvr-primary file:text-white file:text-xs hover:file:bg-mvr-primary/90" />
          </label>
          {!folderUrl && (
            <p className="text-xs text-mvr-warning">
              Attach a Google Drive folder (folder icon above) — uploads are saved there.
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={busy}
              className="px-4 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors">
              {busy ? 'Saving…' : 'Save document'}
            </button>
          </div>
        </form>
      )}

      {lines.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground italic">No document types configured.</div>
      ) : (
        <ul className="divide-y divide-[#E0DBD4]">
          {lines.map(line => {
            const hist = history[line.typeKey] ?? []
            const key = `${line.typeKey}-${line.unitId ?? line.scope}`
            return (
              <li key={key} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    {line.status === 'missing'
                      ? <FileWarning className="w-4 h-4 text-mvr-danger shrink-0" />
                      : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {line.label}
                        {line.scope === 'unit' && line.unitNumber ? <span className="text-muted-foreground font-normal"> · Unit {line.unitNumber}</span> : null}
                        {line.docId && line.version > 1 ? <span className="text-muted-foreground font-normal"> · v{line.version}</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(line.expireDate) ? `Expires ${fmtDate(line.expireDate)}` : line.docId ? 'On file' : 'Not on file'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {line.fileUrl && (
                      <a href={line.fileUrl} target="_blank" rel="noopener noreferrer" className="text-mvr-primary hover:text-mvr-primary/70">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[line.status].className}`}>
                      {STATUS_META[line.status].label}
                    </span>
                    {hist.length > 0 && (
                      <button onClick={() => setOpenHistory(openHistory === key ? null : key)}
                        className="text-muted-foreground hover:text-mvr-primary" title="Version history">
                        <History className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => openAdd(line.typeKey)}
                        className="text-muted-foreground hover:text-mvr-primary" title="Upload new version">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && line.docId && (
                      <button onClick={() => removeDoc(line.docId!, line.label)}
                        className="text-muted-foreground hover:text-mvr-danger" title="Delete current version">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {openHistory === key && hist.length > 0 && (
                  <ul className="mt-2 ml-6 space-y-1 border-l border-[#E0DBD4] pl-3">
                    {hist.map(h => (
                      <li key={h.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          v{h.version}
                          {fmtDate(h.expireDate) ? ` · exp ${fmtDate(h.expireDate)}` : fmtDate(h.issueDate) ? ` · ${fmtDate(h.issueDate)}` : ''}
                        </span>
                        <span className="flex items-center gap-2">
                          {h.fileUrl && (
                            <a href={h.fileUrl} target="_blank" rel="noopener noreferrer" className="text-mvr-primary hover:text-mvr-primary/70">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {canEdit && (
                            <button onClick={() => removeDoc(h.id, line.label)} className="hover:text-mvr-danger" title="Delete this version">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Preview of the files already in the linked Drive folder */}
      {folderUrl && folderFiles.length > 0 && (
        <div className="px-5 py-4 border-t border-[#E0DBD4]">
          <p className="text-xs font-medium text-muted-foreground mb-2">In this folder ({folderFiles.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-[#E0DBD4]">
                  <th className="font-medium px-2 py-2">Name</th>
                  <th className="font-medium px-2 py-2 hidden sm:table-cell whitespace-nowrap">Date modified</th>
                  <th className="font-medium px-2 py-2 text-right whitespace-nowrap">File size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DBD4]">
                {folderFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-mvr-neutral/40 transition-colors">
                    <td className="px-2 py-2">
                      <a
                        href={`https://drive.google.com/file/d/${f.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 min-w-0 text-foreground hover:text-mvr-primary"
                      >
                        <FileTypeIcon name={f.name} />
                        <span className="truncate">{f.name}</span>
                      </a>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap">{fmtModified(f.modifiedTime)}</td>
                    <td className="px-2 py-2 text-muted-foreground text-right whitespace-nowrap">{fmtSize(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
