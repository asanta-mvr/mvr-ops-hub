import { z } from 'zod'

// A named Google Drive folder attached to exactly one of owner / unit. The user
// pastes a full Drive folder URL; the route extracts the id via getDriveFolderId.
export const createFolderSchema = z
  .object({
    name: z.string().min(1).max(120),
    folderUrl: z.string().min(1).max(2000),
    ownerId: z.string().min(1).max(50).optional().nullable(),
    unitId: z.string().min(1).max(50).optional().nullable(),
  })
  .refine(d => [d.ownerId, d.unitId].filter(Boolean).length === 1, {
    message: 'A folder must attach to exactly one of owner or unit',
    path: ['ownerId'],
  })

export type CreateFolderInput = z.infer<typeof createFolderSchema>
