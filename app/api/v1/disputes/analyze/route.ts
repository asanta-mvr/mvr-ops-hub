import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzEdit } from '@/lib/auth/permissions'
import { analyzeInputSchema, type AnalyzeInput } from '@/lib/validations/dispute'
import { checkAnalyzeRateLimit } from '@/lib/disputes/rate-limit'
import { getSystemPrompt, buildAnalyzeSystemPrompt } from '@/lib/disputes/prompts'
import { runAnalyze, type AnalyzeImage, type VisionMediaType } from '@/lib/disputes/anthropic'
import { parseProbs, cleanText } from '@/lib/disputes/parse'
import { getAgentConfigRecord, getRelevantSkills } from '@/lib/disputes/agent'
import { getRelevantKnowledge } from '@/lib/disputes/knowledge'
import { downloadFile } from '@/lib/storage/gcs'

const VISION_MIME = new Set<VisionMediaType>(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_VISION_IMAGES = 6

// Best-effort: pull a few evidence images from GCS and attach as vision blocks.
async function loadVisionImages(paths: string[]): Promise<AnalyzeImage[]> {
  const images: AnalyzeImage[] = []
  for (const path of paths.slice(0, MAX_VISION_IMAGES)) {
    const file = await downloadFile(path)
    if (!file) continue
    if (!VISION_MIME.has(file.contentType as VisionMediaType)) continue
    images.push({
      mediaType: file.contentType as VisionMediaType,
      base64: file.buffer.toString('base64'),
    })
  }
  return images
}

function buildUserText(input: AnalyzeInput): string {
  const parts: string[] = []
  const meta = input.reservationMeta

  // Reservation context block — gives the model the booking facts.
  if (meta) {
    const ctx: string[] = []
    if (meta.confirmationCode) ctx.push(`Código de confirmación: ${meta.confirmationCode}`)
    if (meta.property) ctx.push(`Propiedad: ${meta.property}`)
    if (meta.unit) ctx.push(`Unidad: ${meta.unit}`)
    if (meta.checkinDate) ctx.push(`Check-in: ${meta.checkinDate.slice(0, 10)}`)
    if (meta.checkoutDate) ctx.push(`Check-out: ${meta.checkoutDate.slice(0, 10)}`)
    if (typeof meta.reviewRating === 'number') ctx.push(`Rating de la reseña: ${meta.reviewRating}`)
    if (ctx.length) parts.push(`CONTEXTO DE LA RESERVA:\n${ctx.join('\n')}`)
  }

  // Primary source (chosen by the UI per case type).
  if (input.caseType === 'review') {
    parts.push(`TEXTO DE LA RESEÑA:\n${input.inputText}`)
  } else {
    parts.push(`CHAT DE SOPORTE / NOTIFICACIÓN DE DISPUTA:\n${input.inputText}`)
    if (input.monto) parts.push(`MONTO EN DISPUTA: ${input.monto}`)
    if (input.cronologia) parts.push(`CRONOLOGÍA:\n${input.cronologia}`)
  }

  // Secondary source — the other artifact, as supporting context.
  if (input.caseType === 'review' && meta?.conversationText) {
    parts.push(`CONVERSACIÓN CON EL HUÉSPED (contexto):\n${meta.conversationText}`)
  }
  if (input.caseType === 'disputa' && meta?.reviewText) {
    parts.push(`RESEÑA DEL HUÉSPED (contexto):\n${meta.reviewText}`)
  }

  return parts.join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const rate = await checkAnalyzeRateLimit(session!.user.id)
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — try again shortly', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    const body = await req.json()
    const parsed = analyzeInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const input = parsed.data

    // IDOR guard: evidence paths are client-supplied. Only accept objects under
    // THIS user's own evidence namespace (server-stamped at upload time) and
    // reject path traversal. Prevents reading other users' / other modules' GCS
    // objects via the vision attach + the stored case record.
    const evidencePrefix = `disputes/${session!.user.id}/`
    if (
      input.evidencePaths?.some((p) => !p.startsWith(evidencePrefix) || p.includes('..'))
    ) {
      return NextResponse.json({ error: 'Invalid evidence path' }, { status: 400 })
    }

    // Compose the system prompt from the editable Agent settings (identity +
    // guardrails + matching skills). Falls back to the base prompt if the agent
    // config can't be loaded, so analysis never breaks on a config hiccup.
    let system: string
    try {
      const [config, skills, knowledge] = await Promise.all([
        getAgentConfigRecord(),
        getRelevantSkills(input.caseType, input.ota),
        getRelevantKnowledge(input.caseType, input.ota),
      ])
      system = buildAnalyzeSystemPrompt({
        ota: input.ota,
        caseType: input.caseType,
        config,
        skills,
        knowledge,
      })
    } catch (e) {
      console.error('[analyze] agent config load failed — using base prompt', e)
      system = getSystemPrompt(input.ota, input.caseType)
    }
    const userText = buildUserText(input)
    const images = input.evidencePaths?.length ? await loadVisionImages(input.evidencePaths) : []

    // Provider call — map failures to 502 so the client can distinguish.
    let raw: string
    try {
      raw = await runAnalyze({ system, userText, images })
    } catch (e) {
      console.error('[POST /api/v1/disputes/analyze] provider error', e)
      return NextResponse.json({ error: 'Analysis provider error' }, { status: 502 })
    }

    const probs = parseProbs(raw)
    const resultText = cleanText(raw)

    // Analysis is ephemeral — nothing is persisted here. The user reviews the
    // result and explicitly clicks "Add to tracker" (POST /api/v1/disputes/cases)
    // to create the case, so low-probability analyses don't clutter the tracker.
    return NextResponse.json({ data: { probs, resultText } })
  } catch (error) {
    console.error('[POST /api/v1/disputes/analyze]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
