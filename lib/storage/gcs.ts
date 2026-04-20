import { Storage } from '@google-cloud/storage'

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
