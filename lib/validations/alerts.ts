import { z } from 'zod'

// A reusable, global renewal-alert definition. Routes to internal (Slack channel)
// and/or external (the owner's email) — at least one must be enabled.
export const alertTypeSchema = z
  .object({
    name: z.string().min(1).max(120),
    leadTimeDays: z.array(z.number().int().positive().max(3650)).min(1).max(20),
    sendHour: z.number().int().min(0).max(23).default(9),
    notifyInternal: z.boolean().default(false),
    slackChannel: z.string().max(200).optional().nullable(), // display name
    slackChannelId: z.string().max(50).optional().nullable(), // send target
    slackTemplate: z.string().max(4000).optional().nullable(),
    notifyOwner: z.boolean().default(false),
    emailSubject: z.string().max(300).optional().nullable(),
    emailTemplate: z.string().max(10000).optional().nullable(),
  })
  .refine(d => d.notifyInternal || d.notifyOwner, {
    message: 'Enable at least one of internal (Slack) or external (owner email)',
    path: ['notifyInternal'],
  })
  .refine(d => !d.notifyInternal || (d.slackChannel != null && d.slackChannel.trim().length > 0), {
    message: 'A Slack channel is required for internal notifications',
    path: ['slackChannel'],
  })
  .refine(d => !d.notifyInternal || (d.slackTemplate != null && d.slackTemplate.trim().length > 0), {
    message: 'A Slack message is required for internal notifications',
    path: ['slackTemplate'],
  })
  .refine(d => !d.notifyOwner || (d.emailSubject != null && d.emailSubject.trim().length > 0), {
    message: 'An email subject is required for external notifications',
    path: ['emailSubject'],
  })
  .refine(d => !d.notifyOwner || (d.emailTemplate != null && d.emailTemplate.trim().length > 0), {
    message: 'An email body is required for external notifications',
    path: ['emailTemplate'],
  })

// Test-send: render + deliver the alert type's message using a real entity's owner.
export const testSendSchema = z
  .object({
    ownerId: z.string().min(1).max(50).optional().nullable(),
    unitId: z.string().min(1).max(50).optional().nullable(),
  })
  .refine(d => [d.ownerId, d.unitId].filter(Boolean).length === 1, {
    message: 'Provide exactly one of ownerId or unitId',
    path: ['ownerId'],
  })

// One alert type applied to a single Drive file, with that file's expiry date.
const oneFileAlert = z
  .object({
    folderId: z.string().min(1).max(50),
    driveFileId: z.string().regex(/^[A-Za-z0-9_-]{10,120}$/, 'Invalid Drive file id'),
    fileName: z.string().min(1).max(500),
    expirationDate: z.coerce.date(),
    alertTypeId: z.string().min(1).max(50),
    ownerId: z.string().min(1).max(50).optional().nullable(),
    unitId: z.string().min(1).max(50).optional().nullable(),
  })
  .refine(d => [d.ownerId, d.unitId].filter(Boolean).length === 1, {
    message: 'A file alert must attach to exactly one of owner or unit',
    path: ['ownerId'],
  })

// Accept a single alert or a bulk array; normalize both to an array downstream.
export const fileAlertSchema = z.union([oneFileAlert, z.array(oneFileAlert).min(1).max(200)])

export type AlertTypeInput = z.infer<typeof alertTypeSchema>
export type FileAlertInput = z.infer<typeof oneFileAlert>
