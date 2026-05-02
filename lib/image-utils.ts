const DRIVE_FILE_RE      = /\/file\/d\/([^/?#]+)/
const DRIVE_UC_RE        = /[?&]id=([^&#]+)/
const DRIVE_OPEN_RE      = /\/open\?id=([^&#]+)/
const DRIVE_USERCONTENT_RE = /\/download\?id=([^&#]+)/

/**
 * Converts any Google Drive URL to an embeddable thumbnail URL.
 *
 * Uses drive.google.com/thumbnail?id={id}&sz=w1920 — the official Drive
 * thumbnail endpoint that works for files shared as "Anyone with the link"
 * without requiring authentication. Reliable across all browsers.
 *
 * Handles:
 *   https://drive.google.com/file/d/{id}/view         (webViewLink)
 *   https://drive.google.com/file/d/{id}/edit
 *   https://drive.google.com/open?id={id}
 *   https://drive.google.com/uc?id={id}               (webContentLink)
 *   https://drive.usercontent.google.com/download?id={id}
 */
export function toDriveImageUrl(url: string): string {
  let fileId: string | undefined

  const fileMatch = DRIVE_FILE_RE.exec(url)
  if (fileMatch) fileId = fileMatch[1]

  if (!fileId) {
    const openMatch = DRIVE_OPEN_RE.exec(url)
    if (openMatch) fileId = openMatch[1]
  }

  if (!fileId) {
    const ucMatch = DRIVE_UC_RE.exec(url)
    if (ucMatch) fileId = ucMatch[1]
  }

  if (!fileId) {
    const ucontentMatch = DRIVE_USERCONTENT_RE.exec(url)
    if (ucontentMatch) fileId = ucontentMatch[1]
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`
  }

  return url
}

/** Resolves any stored building/unit image URL to an embeddable URL. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('drive.google.com')) return toDriveImageUrl(url)
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://storage.googleapis.com/mvr-ops-hub-assets/${url}`
}
