// Server-only Anthropic client wrapper for the Dispute Tool. Follows the
// "throw on failure" ethos of lib/integrations/guesty.ts so route handlers can
// map errors to a 502. NEVER import this from a client component.

import Anthropic from '@anthropic-ai/sdk'

export const DISPUTE_MODEL = 'claude-sonnet-4-6'

const ANALYZE_MAX_TOKENS = 2500
const POLICY_MAX_TOKENS = 4000

export type VisionMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface AnalyzeImage {
  mediaType: VisionMediaType
  base64: string
}

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — the Dispute Tool cannot reach Anthropic')
  }
  client = new Anthropic({ apiKey })
  return client
}

/** Concatenates all text blocks from a message response. */
function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

/**
 * Runs the main case analysis. `system` is the composed OTA prompt
 * (see getSystemPrompt). Optional evidence images are attached as vision blocks.
 * Returns the raw model text (caller runs parseProbs + cleanText).
 */
export async function runAnalyze(params: {
  system: string
  userText: string
  images?: AnalyzeImage[]
}): Promise<string> {
  const { system, userText, images } = params

  const content: Anthropic.ContentBlockParam[] = []
  for (const img of images ?? []) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    })
  }
  content.push({ type: 'text', text: userText })

  const message = await getClient().messages.create({
    model: DISPUTE_MODEL,
    max_tokens: ANALYZE_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content }],
  })

  return extractText(message)
}

/**
 * Runs the policy-extraction call. Returns the raw model text (caller repairs +
 * JSON-parses + validates against policyJsonSchema).
 */
export async function runPolicyUpdate(params: {
  system: string
  userText: string
}): Promise<string> {
  const message = await getClient().messages.create({
    model: DISPUTE_MODEL,
    max_tokens: POLICY_MAX_TOKENS,
    system: params.system,
    messages: [{ role: 'user', content: params.userText }],
  })

  return extractText(message)
}

/** Summarizes a fetched page into a knowledge-base entry body. */
export async function runKnowledgeExtract(params: {
  system: string
  userText: string
}): Promise<string> {
  const message = await getClient().messages.create({
    model: DISPUTE_MODEL,
    max_tokens: 2000,
    system: params.system,
    messages: [{ role: 'user', content: params.userText }],
  })

  return extractText(message)
}
