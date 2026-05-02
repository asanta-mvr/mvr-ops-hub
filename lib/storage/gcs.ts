import { Storage } from '@google-cloud/storage'
import { toDriveImageUrl, isDriveFolderUrl } from '@/lib/image-utils'

function createStorageClient(): Storage {
  const keyBase64 = process.env.GCS_SERVICE_ACCOUNT_KEY
  if (!keyBase64) throw new Error('GCS_SERVICE_ACCOUNT_KEY environment variable is not set')

  return new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(Buffer.from(keyBase64, 'base64').toString()),
  })
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME
  if (!bucketName) throw new Error('GCS_BUCKET_NAME environment variable is not set')
  return createStorageClient().bucket(bucketName)
}

export async function uploadFile(
  file: Buffer,
  destination: string,
  contentType: string
): Promise<string> {
  const bucket = getBucket()
  const fileRef = bucket.file(destination)

  await fileRef.save(file, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })

  const [signedUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  })

  return signedUrl
}

export async function deleteFile(destination: string): Promise<void> {
  const bucket = getBucket()
  await bucket.file(destination).delete({ ignoreNotFound: true })
}

export function getGcsPath(
  type: 'buildings' | 'units' | 'owners' | 'contracts' | 'inspections',
  id: string,
  filename: string
): string {
  return `${type}/${id}/${filename}`
}

/**
 * Returns a 1-hour signed URL for a GCS object path.
 * Pass a relative path (e.g. "Buildings_Images/xxx.jpg") — full GCS/Drive/http URLs are
 * returned unchanged so callers don't need to pre-filter.
 */
export async function getSignedImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  if (isDriveFolderUrl(path)) return null          // folder URLs handled separately via listFolderImages()
  if (path.includes('drive.google.com')) return toDriveImageUrl(path)
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  try {
    const bucket = getBucket()
    const [signedUrl] = await bucket.file(path).getSignedUrl({
      action:  'read',
      expires: Date.now() + 60 * 60 * 1000,
    })
    return signedUrl
  } catch {
    return null
  }
}
