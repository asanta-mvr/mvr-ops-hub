'use client'

import { useRef, useState } from 'react'
import { Trash2, Upload, FileText, ExternalLink, AlertCircle } from 'lucide-react'
import type { DriveFolder } from '@/lib/integrations/google-drive'
import type { UploadResult } from '@/lib/validations/upload'

interface UploadingFile {
  id:       string
  name:     string
  progress: number
  status:   'uploading' | 'done' | 'error'
  error?:   string
  result?:  UploadResult
}

interface FileUploaderProps {
  value:      string[]
  onChange:   (urls: string[]) => void
  folder:     DriveFolder
  accept?:    string
  maxFiles?:  number
  label?:     string
  disabled?:  boolean
}

function uploadViaXhr(
  file: File,
  folder: DriveFolder,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 201) {
        try {
          resolve((JSON.parse(xhr.responseText) as { data: UploadResult }).data)
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else {
        try {
          reject(new Error((JSON.parse(xhr.responseText) as { error: string }).error ?? 'Upload failed'))
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
    }

    xhr.onerror  = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.timeout  = 60_000

    xhr.open('POST', '/api/v1/upload')
    xhr.send(formData)
  })
}

function shortName(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/')
    return decodeURIComponent(parts[parts.length - 1] || url)
  } catch {
    return url
  }
}

export function FileUploader({
  value     = [],
  onChange,
  folder,
  accept    = 'image/*,application/pdf',
  maxFiles  = 10,
  label,
  disabled  = false,
}: FileUploaderProps) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])

  function handleFiles(files: FileList | null) {
    if (!files || disabled) return
    const remaining = maxFiles - value.length
    const toUpload  = Array.from(files).slice(0, remaining)
    if (toUpload.length === 0) return

    toUpload.forEach((file) => {
      const id: string = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      setUploading((prev) => [
        ...prev,
        { id, name: file.name, progress: 0, status: 'uploading' },
      ])

      uploadViaXhr(
        file,
        folder,
        (pct) =>
          setUploading((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress: pct } : f))
          )
      )
        .then((result) => {
          setUploading((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'done', result } : f))
          )
          onChange([...value, result.webViewLink])
          // Remove from uploading list after short delay so user sees "done"
          setTimeout(
            () => setUploading((prev) => prev.filter((f) => f.id !== id)),
            1200
          )
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploading((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'error', error: msg } : f))
          )
        })
    })
  }

  function removeUrl(url: string) {
    onChange(value.filter((u) => u !== url))
  }

  const canUpload = !disabled && value.length + uploading.filter(u => u.status === 'uploading').length < maxFiles

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => canUpload && inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); if (canUpload) setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDragOver={(e)  => { e.preventDefault() }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          px-4 py-6 text-center transition-colors
          ${canUpload ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
          ${dragging
            ? 'border-mvr-primary bg-mvr-primary-light'
            : 'border-[#E0DBD4] hover:border-mvr-primary hover:bg-mvr-neutral/40'}
        `}
      >
        <Upload className="w-6 h-6 text-mvr-steel" />
        <div>
          <p className="text-sm font-medium text-mvr-primary">
            {label ?? 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF, images, Word, Excel · Max 4 MB per file
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={!canUpload}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Files uploading right now */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((f) => (
            <div key={f.id} className="rounded-lg border px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs truncate text-foreground">{f.name}</span>
                </div>
                {f.status === 'error' && (
                  <span className="text-xs text-mvr-danger shrink-0 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {f.error}
                  </span>
                )}
                {f.status === 'done' && (
                  <span className="text-xs text-mvr-success shrink-0">✓ Done</span>
                )}
              </div>
              {f.status === 'uploading' && (
                <div className="h-1 w-full bg-mvr-neutral rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mvr-primary rounded-full transition-all duration-200"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Already uploaded files */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((url) => (
            <div
              key={url}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 group"
            >
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-mvr-primary hover:underline truncate flex items-center gap-1"
              >
                {shortName(url)}
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
              </a>
              <button
                type="button"
                onClick={() => removeUrl(url)}
                disabled={disabled}
                className="shrink-0 text-muted-foreground hover:text-mvr-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && uploading.length === 0 && (
        <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
      )}
    </div>
  )
}
