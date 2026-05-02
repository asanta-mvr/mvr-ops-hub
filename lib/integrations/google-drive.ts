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
  })

  const urls = (res.data.files ?? [])
    .filter((f) => f.id)
    .map((f) => `https://drive.google.com/thumbnail?id=${f.id}&sz=w1920`)

  folderImageCache.set(folderId, { urls, expires: Date.now() + 10 * 60 * 1000 })
  return urls
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
