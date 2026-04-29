const DRIVE_FILE_RE = /\/file\/d\/([^/?#]+)/
const DRIVE_UC_RE   = /[?&]id=([^&#]+)/

/**
 * Converts a Google Drive viewer URL to a direct CDN URL embeddable as
 * <img src> or CSS background-image without authentication cookies.
 *
 * Uses lh3.googleusercontent.com/d/{id} — Google's Drive CDN endpoint —
 * which serves the raw image for files shared as "Anyone with the link".
 *
 * Handles:
 *   https://drive.google.com/file/d/{id}/view   (webViewLink)
 *   https://drive.google.com/uc?id={id}          (webContentLink)
 */
export function toDriveImageUrl(url: string): string {
  const fileMatch = DRIVE_FILE_RE.exec(url)
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`
  }
  const ucMatch = DRIVE_UC_RE.exec(url)
  if (ucMatch) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`
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
