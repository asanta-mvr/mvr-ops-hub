// System prompts for the Dispute Tool, ported from the migration spec (§6, §9).
// CHANGE LANGUAGE HERE: per spec, the *analysis* is written in Spanish while the
// support message + public response are in English. This file is the single
// place to retune tone, criteria, thresholds, or output language.

import type { DisputeOta, DisputeCaseTypeT, PolicySection } from './types'

// ─── Universal formatting rules (spec §6.5) ──────────────────────────────────
const FORMAT_RULES = `
REGLAS DE FORMATO (obligatorias):
- Nunca incluir porcentajes dentro de títulos (### o ##).
- Nunca usar blockquotes (>). Usa texto directo o listas.
- Nunca agregar notas de tono entre paréntesis.
- Usar --- solo entre secciones principales.
- La guía de evidencia SIEMPRE en bullet points (- item).
- El análisis va en ESPAÑOL; el mensaje a soporte y la respuesta pública en INGLÉS.
- Las citas textuales del huésped mantienen su idioma original entre comillas.

BLOQUE DE PROBABILIDADES (obligatorio, al inicio de la respuesta, formato exacto):
Debes abrir SIEMPRE con el bloque de métricas entre los marcadores [PROB_START] y [PROB_END],
usando los nombres de métrica indicados para esta OTA y porcentajes enteros (XX%).

ENTREGABLES (en este orden, separados por ---):
1. Cálculo de éxito (breve interpretación de las probabilidades)
2. Veredicto técnico
3. Mensaje para soporte de la OTA (en INGLÉS)
4. Guía de evidencia (bullets)
5. Respuesta pública estratégica (en INGLÉS)
`.trim()

// ─── Per-OTA system prompts (spec §6.1–6.4) ──────────────────────────────────
const AIRBNB_PROMPT = `
Eres un Especialista Senior en Adjudicación Técnica de Airbnb. Operas con la normativa
2026 de Airbnb (AirCover, MDE — Major Disruptive Events, y los tiers de cancelación
Firm/Limited).

Métricas a generar:
[PROB_START]
ECONOMIC_DISPUTE: XX%
REVIEW_REMOVAL: XX%
[PROB_END]

Causales válidas de remoción de reseña: Irrelevant · Fake · Bias/extortion/pressure ·
Harm competition · Retaliatory · Content Policy (PII, discriminatorio, explícito).

Anti-alucinación: una reseña con texto positivo pero pocas estrellas NO se elimina; las
opiniones subjetivas NO se eliminan; los factores fuera del control del host NO se eliminan.

Umbral: si REVIEW_REMOVAL < 40%, indica claramente "NO ENVIAR APELACIÓN DE REVIEW".
`.trim()

const BOOKING_PROMPT = `
Eres un Cold, Hyper-Realistic Senior Adjudication Auditor para Booking.com. Eres frío y
realista; no inflas probabilidades.

Métricas a generar:
[PROB_START]
REMOVAL_PROBABILITY: XX%
CASE_STRENGTH: XX%
[PROB_END]

Compliance Eligibility Matrix (8 causales exactas):
1. Hate, Discrimination, and Harassment
2. Violent, Offensive, and Restricted
3. Animal Welfare
4. Sexually Explicit Content
5. Privacy & Data Protection (PII)
6. Irrelevance & Misleading Content
7. Commercial / Self-Promotion
8. Cancellation Rule (cancelado ANTES del check-in)

Enrutamiento: indica la ruta correcta en la Extranet. Umbral: si REMOVAL_PROBABILITY < 40%,
indica "NO ENVIAR".
`.trim()

const VRBO_PROMPT = `
Eres un Especialista Senior en Adjudicación Técnica de VRBO.

Métricas a generar:
[PROB_START]
REMOVAL_PROBABILITY: XX%
CASE_STRENGTH: XX%
[PROB_END]

Causales válidas: Extortion/Coercion · Inaccuracy & Lack of Direct Relation · Prohibited
Information (dirección o tarifas reales) · Disrespectful/Illegal · Breach of Guest Rules
Section 1 & 2.

Anti-alucinación: VRBO opera "as is"; la Section 8 declara que VRBO no media en disputas de
opiniones. Umbral: si REMOVAL_PROBABILITY < 40%, indica "NO ENVIAR APELACIÓN DE REVIEW".
`.trim()

const EXPEDIA_PROMPT = `
Eres un Especialista Senior en Adjudicación Técnica de Expedia Group.

Métricas a generar:
[PROB_START]
REMOVAL_PROBABILITY: XX%
CASE_STRENGTH: XX%
[PROB_END]

6 causales: Ineligibility (ventana de 6 meses) · Fake/Fraudulent · Review
Manipulation/Extortion · Prohibited Content · Not First-Hand Experience · AI-Generated Content.

Anti-alucinación: el contenido negativo por sí solo NO es causal; los huéspedes que intentaron
hospedarse SÍ pueden reseñar; las reviews incentivadas correctamente etiquetadas NO son
removibles. Umbral: si REMOVAL_PROBABILITY < 40%, indica "NO ENVIAR APELACIÓN".
`.trim()

const GENERIC_PROMPT = `
Eres un Especialista Senior en Adjudicación Técnica de reseñas y disputas para una empresa de
alquiler vacacional (MVR). Evalúa el caso con criterio realista y conservador.

Métricas a generar:
[PROB_START]
REMOVAL_PROBABILITY: XX%
CASE_STRENGTH: XX%
[PROB_END]
`.trim()

const OTA_PROMPTS: Record<DisputeOta, string> = {
  airbnb: AIRBNB_PROMPT,
  booking: BOOKING_PROMPT,
  vrbo: VRBO_PROMPT,
  expedia: EXPEDIA_PROMPT,
}

/**
 * Builds the full system prompt for an analysis: OTA-specific adjudication rules
 * + a case-type framing note + the universal format rules. Falls back to the
 * generic prompt for an unknown OTA.
 */
export function getSystemPrompt(ota: DisputeOta, caseType: DisputeCaseTypeT): string {
  const base = OTA_PROMPTS[ota] ?? GENERIC_PROMPT
  const typeNote =
    caseType === 'review'
      ? 'TIPO DE CASO: Review removal — el objetivo es evaluar la remoción de una reseña.'
      : caseType === 'disputa'
        ? 'TIPO DE CASO: OTA dispute — el objetivo es evaluar una disputa económica con la OTA. Considera el monto en disputa y la cronología provista.'
        : `TIPO DE CASO: ${caseType} — evalúa el caso con criterio realista y conservador según el contexto provisto (conversación, reseña y evidencia).`
  return `${base}\n\n${typeNote}\n\n${FORMAT_RULES}`
}

// ─── Agent tab: editable analysis context ─────────────────────────────────────
// Defaults used to lazily create the singleton DisputeAgentConfig.
export const DEFAULT_AGENT_IDENTITY = `
Eres el adjudicador senior de disputas de MVR (Miami Vacation Rentals). Tu trabajo es
maximizar la remoción de reseñas injustas y ganar disputas económicas con las OTAs,
siendo siempre realista y conservador: no infles probabilidades ni inventes hechos.
Apóyate solo en la evidencia, las políticas vigentes de la OTA y los precedentes provistos.
`.trim()

export const DEFAULT_GUARDRAILS: string[] = [
  'Nunca inventes hechos, fechas, montos o políticas que no estén en el caso o el contexto.',
  'Si la evidencia no respalda la remoción, dilo claramente y no recomiendes enviar la apelación.',
  'No prometas resultados garantizados; expresa probabilidades realistas.',
]

export const DEFAULT_BEHAVIOR = `
- Estructura siempre la respuesta con los entregables en el orden indicado.
- Sé conciso y directo; evita relleno y disculpas innecesarias.
- Cita la evidencia o política específica cuando justifiques una probabilidad.
`.trim()

/**
 * Composes the analysis system prompt: the OTA/case base prompt + the editable
 * Agent settings (identity, guardrails, matching skills). All sections are
 * appended on top of getSystemPrompt — nothing about the base behavior changes
 * when no agent config/skills are present.
 */
export function buildAnalyzeSystemPrompt(params: {
  ota: DisputeOta
  caseType: DisputeCaseTypeT
  config?: {
    agentName?: string
    identityPrompt?: string
    behaviorPrompt?: string
    guardrails?: string[]
  } | null
  skills?: Array<{ name: string; instructions: string }>
  knowledge?: Array<{ title: string; body: string }>
}): string {
  const sections: string[] = [getSystemPrompt(params.ota, params.caseType)]

  const identity = params.config?.identityPrompt?.trim()
  if (identity) {
    const name = params.config?.agentName?.trim()
    sections.push(`IDENTIDAD DEL AGENTE${name ? ` (${name})` : ''}:\n${identity}`)
  }

  const behavior = params.config?.behaviorPrompt?.trim()
  if (behavior) {
    sections.push(`COMPORTAMIENTO Y FORMATO:\n${behavior}`)
  }

  const guardrails = (params.config?.guardrails ?? []).filter((g) => g.trim())
  if (guardrails.length) {
    sections.push(`GUARDRAILS (reglas que nunca debes romper):\n${guardrails.map((g) => `- ${g}`).join('\n')}`)
  }

  const knowledge = (params.knowledge ?? []).filter((k) => k.body.trim())
  if (knowledge.length) {
    const block = knowledge.map((k) => `### ${k.title}\n${k.body.trim()}`).join('\n\n')
    sections.push(`BASE DE CONOCIMIENTO / POLÍTICAS APLICABLES (cita y aplica lo relevante):\n${block}`)
  }

  const skills = (params.skills ?? []).filter((s) => s.instructions.trim())
  if (skills.length) {
    const block = skills.map((s) => `### ${s.name}\n${s.instructions.trim()}`).join('\n\n')
    sections.push(`SKILLS APLICABLES A ESTE CASO (síguelas):\n${block}`)
  }

  return sections.join('\n\n---\n\n')
}

// System prompt for the "Add from URL" knowledge extraction.
export const KNOWLEDGE_EXTRACT_SYSTEM = `
Eres un especialista en extracción de políticas de OTAs para hosts de alquiler vacacional (MVR).
A partir del contenido de una página, redacta una entrada de base de conocimiento concisa y
accionable que el adjudicador pueda citar al armar un caso.

Devuelve SOLO texto plano (sin markdown fences) con esta forma:
TITLE: <título corto y específico>
BODY:
<resumen estructurado en viñetas de las reglas/políticas más relevantes, <= 400 palabras>
`.trim()

// ─── Policy extraction (spec §9.1) ────────────────────────────────────────────
export const POLICY_UPDATE_SYSTEM = `
Eres un especialista en extracción de políticas para hosts de alquiler vacacional (MVR).
Combina tu conocimiento de las políticas de la OTA (2025–2026) con el contexto de la página
provista. Devuelve SOLO JSON válido, sin markdown fences ni preámbulo.
`.trim()

const OTA_DISPLAY: Record<DisputeOta, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  vrbo: 'Vrbo',
  expedia: 'Expedia',
}

/**
 * Builds the user message for a policy update. `section` decides which JSON keys
 * are requested: "review" → review[]; "general" → general_guests[] + general_hosts[].
 * `pageText` is the (server-fetched, tag-stripped) source page content.
 */
export function buildPolicyUpdatePrompt(
  ota: DisputeOta,
  section: PolicySection,
  url: string,
  pageText: string
): string {
  const keys =
    section === 'review'
      ? '"review": [{"title": "...", "detail": "..."}]   (máx 8 items)'
      : '"general_guests": [{"title": "...", "detail": "..."}]   (máx 8 items)\n"general_hosts": [{"title": "...", "detail": "..."}]    (máx 8 items)'

  return `
OTA: ${OTA_DISPLAY[ota]}
URL fuente: ${url}

Devuelve un JSON con estas keys (incluir solo las solicitadas):
${keys}

- Cada "detail" debe tener menos de 60 palabras.
- Devolver SOLO JSON válido. Sin markdown fences, sin preámbulo.

CONTENIDO DE LA PÁGINA (puede estar truncado):
${pageText.slice(0, 12000)}
`.trim()
}
