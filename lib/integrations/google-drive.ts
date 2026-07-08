import { google } from 'googleapis'
import { Readable } from 'node:stream'

export type DriveFolder = 'buildings' | 'units' | 'owners' | 'contracts'

export interface DriveUploadResult {
  fileId:         string
  webViewLink:    string
  webContentLink: string
  name:           string
  mimeType:       string
  size:           number
}

// Module-level cache to avoid repeated subfolder lookups within a warm instance
const subfolderCache = new Map<string, string>()

function createDriveClient() {
  const keyBase64 = process.env.GCS_SERVICE_ACCOUNT_KEY
  if (!keyBase64) throw new Error('GCS_SERVICE_ACCOUNT_KEY is not set')

  const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString())
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!id) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set')
  return id
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s\-_.()]/g, '').trim().replace(/\s+/g, '_') || 'file'
}

async function getOrCreateSubfolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  name: string
): Promise<string> {
  const cacheKey = `${parentId}/${name}`
  const cached = subfolderCache.get(cacheKey)
  if (cached) return cached

  // Search for existing folder
  const res = await drive.files.list({
    q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  let folderId: string

  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!
  } else {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    })
    folderId = created.data.id!
  }

  subfolderCache.set(cacheKey, folderId)
  return folderId
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: DriveFolder
): Promise<DriveUploadResult> {
  const drive      = createDriveClient()
  const rootId     = getRootFolderId()
  const folderId   = await getOrCreateSubfolder(drive, rootId, folder)
  const safeName   = sanitizeFileName(fileName)

  const response = await drive.files.create({
    requestBody: {
      name:    safeName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id,webViewLink,webContentLink,name,mimeType,size',
  })

  const file = response.data
  if (!file.id) throw new Error('Drive upload failed: no file ID returned')

  // Anyone with the link can view — no login required
  await drive.permissions.create({
    fileId:      file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return {
    fileId:         file.id,
    webViewLink:    file.webViewLink    ?? `https://drive.google.com/file/d/${file.id}/view`,
    webContentLink: file.webContentLink ?? `https://drive.google.com/uc?id=${file.id}`,
    name:           file.name           ?? safeName,
    mimeType:       file.mimeType       ?? mimeType,
    size:           Number(file.size ?? buffer.length),
  }
}

/**
 * Ensures a nested folder path exists under the configured root, creating each
 * level as needed, and returns the deepest folder's id. e.g.
 * ensureEntityFolder(['Owners', 'Carlos R (abc123)', 'Cyber Capital LLC']).
 */
export async function ensureEntityFolder(path: string[]): Promise<string> {
  const drive = createDriveClient()
  let parent = getRootFolderId()
  for (const raw of path) {
    // Drive folder names may keep spaces; only strip quote/backslash that would
    // break the lookup query.
    const name = raw.replace(/['\\]/g, '').trim() || 'folder'
    parent = await getOrCreateSubfolder(drive, parent, name)
  }
  return parent
}

/** Uploads a file into a specific Drive folder (works for My Drive and Shared Drives). */
export async function uploadFileToFolder(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = createDriveClient()
  const safeName = sanitizeFileName(fileName)
  // supportsAllDrives is required or the API 404s on folders that live in a
  // Shared Drive (where the service account shows as "Content manager").
  const response = await drive.files.create({
    requestBody: { name: safeName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,webViewLink',
    supportsAllDrives: true,
  })
  const file = response.data
  if (!file.id) throw new Error('Drive upload failed: no file ID returned')
  // Best-effort public-read link. Shared Drives often forbid per-file "anyone"
  // sharing (the file inherits the drive's access instead), so don't fail the
  // upload if this is rejected.
  try {
    await drive.permissions.create({
      fileId: file.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    })
  } catch (err) {
    console.warn('[drive] could not set anyone-reader permission (likely a Shared Drive):', (err as Error).message)
  }
  return { fileId: file.id, webViewLink: file.webViewLink ?? getDriveFileViewLink(file.id) }
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = createDriveClient()
  await drive.files.delete({ fileId })
}

export function getDriveFileViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`
}

// In-memory cache for folder image listings (10-minute TTL per folder)
const folderImageCache = new Map<string, { urls: string[]; expires: number }>()

/**
 * Lists image files inside a Google Drive folder and returns thumbnail URLs.
 * The folder must be shared with the service account (GCS_SERVICE_ACCOUNT_KEY).
 * Results are cached for 10 minutes to avoid repeated API calls.
 */
export async function listFolderImages(folderId: string): Promise<string[]> {
  const cached = folderImageCache.get(folderId)
  if (cached && cached.expires > Date.now()) return cached.urls

  const drive = createDriveClient()

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id,name)',
    spaces: 'drive',
    orderBy: 'name',
    pageSize: 30,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  const files = res.data.files ?? []
  console.log(`[drive] folder=${folderId} found ${files.length} images`)

  // Serve through our proxy so the browser doesn't need its own Google auth
  const urls = files
    .filter((f) => f.id)
    .map((f) => `/api/v1/drive/image/${f.id}`)

  folderImageCache.set(folderId, { urls, expires: Date.now() + 10 * 60 * 1000 })
  return urls
}

/**
 * Lists image files inside a Google Drive folder, returning ids + names so
 * callers can store a stable fileId and render via the `/api/v1/drive/image/{id}`
 * proxy. Used by the listing photo picker (select-from-Drive).
 */
export async function listFolderImageFiles(folderId: string): Promise<Array<{ fileId: string; name: string }>> {
  const drive = createDriveClient()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id,name)',
    spaces: 'drive',
    orderBy: 'name',
    pageSize: 200,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return (res.data.files ?? [])
    .filter((f) => f.id)
    .map((f) => ({ fileId: f.id!, name: f.name ?? f.id! }))
}

/**
 * Lists every (non-folder) file inside a Drive folder — used to preview the
 * documents already sitting in a card's linked folder. The folder must be shared
 * with the service account (or "anyone with the link").
 */
export interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  size: number | null
}

export async function listFolderFiles(folderId: string): Promise<DriveFileInfo[]> {
  // Defense-in-depth: only URL-safe ids reach the Drive query string.
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(folderId)) return []
  const drive = createDriveClient()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
    pageSize: 200,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return (res.data.files ?? [])
    .filter((f) => f.id)
    .map((f) => ({
      id: f.id!,
      name: f.name ?? f.id!,
      mimeType: f.mimeType ?? '',
      modifiedTime: f.modifiedTime ?? null,
      size: f.size != null ? Number(f.size) : null,
    }))
}

/**
 * Fetches a Drive folder's display name (for pre-filling the folder-name field
 * when a user pastes a folder link). Returns null if inaccessible. Works for My
 * Drive and Shared Drives.
 */
export async function getDriveFolderName(folderId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(folderId)) return null
  try {
    const drive = createDriveClient()
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'name',
      supportsAllDrives: true,
    })
    return res.data.name ?? null
  } catch {
    return null
  }
}

/** Returns the service account email used for Drive access, for sharing instructions. */
export function getDriveServiceAccountEmail(): string | null {
  try {
    const key = process.env.GCS_SERVICE_ACCOUNT_KEY
    if (!key) return null
    const creds = JSON.parse(Buffer.from(key, 'base64').toString()) as { client_email?: string }
    return creds.client_email ?? null
  } catch {
    return null
  }
}
