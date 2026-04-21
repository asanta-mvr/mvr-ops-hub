import { z } from 'zod'

export const UPLOAD_FOLDERS = ['buildings', 'units', 'owners', 'contracts'] as const
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number]

export const uploadParamsSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
  name:   z.string().max(255).optional(),
})

export const uploadResultSchema = z.object({
  fileId:         z.string(),
  webViewLink:    z.string().url(),
  webContentLink: z.string().url(),
  name:           z.string(),
  mimeType:       z.string(),
  size:           z.number(),
})

export type UploadResult = z.infer<typeof uploadResultSchema>
