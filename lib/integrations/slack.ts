// Slack Web API client.
//
// Auth is a single bot token (xoxb-…). It is sourced from the SLACK_BOT_TOKEN
// environment variable (the source of truth when present) or from the encrypted
// `SlackConnection.botToken` column. The connection row is treated as a
// singleton (one company-wide workspace) but the table shape leaves room for
// more — mirroring the Guesty integration.
//
// Slack quirk: the Web API returns HTTP 200 even on failure, with the real
// outcome in the JSON body `{ ok: false, error: "…" }`. Every call therefore
// checks `ok` and throws on `ok === false`, so callers get a normal rejection.
import type { SlackConnection } from '@prisma/client'
import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/auth/crypto'

const SLACK_BASE = 'https://slack.com/api'
const KEY_ENV = 'INTEGRATION_SECRET_KEY'

// ─── token resolution ────────────────────────────────────────────────────────

/** Bot token from the environment (the source of truth). Null when unset. */
export function getEnvBotToken(): string | null {
  const token = process.env.SLACK_BOT_TOKEN
  return token && token.length > 0 ? token : null
}

/** True when the bot token is supplied via the environment. */
export function isEnvManaged(): boolean {
  return getEnvBotToken() !== null
}

// Encrypt-at-rest helpers for the stored token. Encrypts when
// INTEGRATION_SECRET_KEY is set; otherwise stores plainly (prefixed so we know
// how to read it back). Identical scheme to the cached Guesty token.
export function storeToken(plain: string): string {
  if (process.env[KEY_ENV]) return `enc:${encryptSecret(plain, KEY_ENV)}`
  return `raw:${plain}`
}
function readStoredToken(stored: string): string {
  if (stored.startsWith('enc:')) return decryptSecret(stored.slice(4), KEY_ENV)
  if (stored.startsWith('raw:')) return stored.slice(4)
  return decryptSecret(stored, KEY_ENV) // legacy value written before prefixing
}

/**
 * Resolve the usable bot token for a connection: the env var wins; otherwise
 * decrypt the value stored on the row. Throws when neither is available.
 */
export function resolveToken(connection: SlackConnection | null): string {
  const env = getEnvBotToken()
  if (env) return env
  if (!connection || !connection.botToken) {
    throw new Error('No Slack bot token configured (set SLACK_BOT_TOKEN or save one in the connection form)')
  }
  return readStoredToken(connection.botToken)
}

/**
 * Return the singleton connection row, auto-provisioning one from the env token
 * if none exists yet. Returns null only when there is neither a stored
 * connection nor an env token.
 */
export async function getOrCreateConnection(): Promise<SlackConnection | null> {
  const existing = await db.slackConnection.findFirst({ orderBy: { createdAt: 'asc' } })
  if (existing) return existing

  if (!getEnvBotToken()) return null

  return db.slackConnection.create({
    data: { name: 'MVR Workspace', botToken: '', status: 'disconnected' },
  })
}

// ─── request helper ──────────────────────────────────────────────────────────

interface SlackResponse {
  ok: boolean
  error?: string
  response_metadata?: { next_cursor?: string }
  [key: string]: unknown
}

/** GET against a Slack method, throwing on transport or `ok:false` failures. */
async function slackGet<T extends SlackResponse>(
  token: string,
  method: string,
  params: Record<string, string> = {},
): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const url = `${SLACK_BASE}/${method}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Slack ${method} failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as T
  if (!json.ok) throw new Error(`Slack ${method} error: ${json.error ?? 'unknown_error'}`)
  return json
}

/** POST (JSON) against a Slack method, throwing on transport or `ok:false`. */
async function slackPost<T extends SlackResponse>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${SLACK_BASE}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Slack ${method} failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as T
  if (!json.ok) throw new Error(`Slack ${method} error: ${json.error ?? 'unknown_error'}`)
  return json
}

// ─── typed API surface ───────────────────────────────────────────────────────

export interface SlackAuthTest {
  teamId: string | null
  teamName: string | null
  botUserId: string | null
}

/** Validate a token and return the workspace identity. */
export async function authTest(token: string): Promise<SlackAuthTest> {
  const json = await slackGet<SlackResponse & { team_id?: string; team?: string; user_id?: string }>(
    token,
    'auth.test',
  )
  return {
    teamId: json.team_id ?? null,
    teamName: json.team ?? null,
    botUserId: json.user_id ?? null,
  }
}

export interface SlackChannelLite {
  slackChannelId: string
  name: string
  isPrivate: boolean
  isArchived: boolean
  isMember: boolean
  numMembers: number | null
}

interface RawSlackChannel {
  id: string
  name: string
  is_private?: boolean
  is_archived?: boolean
  is_member?: boolean
  num_members?: number
}

/**
 * List every channel in the workspace, following cursor pagination to the end.
 * `types` defaults to public channels only; pass 'public_channel,private_channel'
 * to include private channels the bot has been added to (needs `groups:read`).
 */
export async function listChannels(
  token: string,
  types = 'public_channel',
): Promise<SlackChannelLite[]> {
  const out: SlackChannelLite[] = []
  let cursor = ''
  do {
    const params: Record<string, string> = {
      types,
      exclude_archived: 'false',
      limit: '200',
    }
    if (cursor) params.cursor = cursor
    const json = await slackGet<SlackResponse & { channels?: RawSlackChannel[] }>(
      token,
      'conversations.list',
      params,
    )
    for (const c of json.channels ?? []) {
      out.push({
        slackChannelId: c.id,
        name: c.name,
        isPrivate: Boolean(c.is_private),
        isArchived: Boolean(c.is_archived),
        isMember: Boolean(c.is_member),
        numMembers: typeof c.num_members === 'number' ? c.num_members : null,
      })
    }
    cursor = json.response_metadata?.next_cursor ?? ''
  } while (cursor)
  return out
}

/** Block Kit block — kept loose; message builders own the concrete shape. */
export type SlackBlock = Record<string, unknown>

export interface PostMessageResult {
  channel: string
  ts: string
}

/** Post a message to a channel. `text` is the notification/fallback text. */
export async function postMessage(
  token: string,
  channelId: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<PostMessageResult> {
  const json = await slackPost<SlackResponse & { channel?: string; ts?: string }>(
    token,
    'chat.postMessage',
    blocks ? { channel: channelId, text, blocks } : { channel: channelId, text },
  )
  return { channel: json.channel ?? channelId, ts: json.ts ?? '' }
}

/** Edit a previously-posted message (used by Phase C button handlers). */
export async function updateMessage(
  token: string,
  channelId: string,
  ts: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<void> {
  await slackPost(
    token,
    'chat.update',
    blocks ? { channel: channelId, ts, text, blocks } : { channel: channelId, ts, text },
  )
}
