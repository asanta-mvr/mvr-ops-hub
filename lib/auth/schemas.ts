// Zod schemas for user management API routes. Use `safeParse` from each
// handler to surface a 400 with structured error details on failure.
import { z } from 'zod'
import { LEVELS, RESOURCES } from './resources'

const RESOURCE_KEYS = RESOURCES.map((r) => r.key) as [string, ...string[]]

// At least the domain part must match `ALLOWED_EMAIL_DOMAIN`. We accept the
// env at module-load time; if unset we fall back to the company domain so
// the schema still works in dev without configuration.
const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'miamivacationrentals.com').toLowerCase()

const companyEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email')
  .refine((v) => v.endsWith(`@${ALLOWED_DOMAIN}`), {
    message: `Email must be on @${ALLOWED_DOMAIN}`,
  })

export const permissionEntrySchema = z.object({
  resource: z.enum(RESOURCE_KEYS),
  level: z.enum(LEVELS as unknown as [string, ...string[]]),
})

export const inviteUserSchema = z.object({
  email: companyEmail,
  name: z.string().trim().min(1).max(120).optional(),
  permissions: z.array(permissionEntrySchema).max(RESOURCES.length).default([]),
  message: z.string().trim().max(500).optional(),
})

export const updatePermissionsSchema = z.object({
  permissions: z.array(permissionEntrySchema).max(RESOURCES.length).default([]),
})

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(120).optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type PermissionEntry = z.infer<typeof permissionEntrySchema>
