// Pure parsing helpers for the AI analysis output. No I/O — safe to unit test.
// Ports parseProbs + cleanText from the migration spec (§7.1, §7.2).

import type { DisputeProbs } from './types'

const PROB_BLOCK_RE = /\[PROB_START\]([\s\S]*?)\[PROB_END\]/
const PROB_LINE_RE = /([A-Z_]+):\s*(\d+)%/

/**
 * Extracts the [PROB_START]..[PROB_END] metric block into a map of
 * UPPER_SNAKE → integer percentage. Returns null when no block / no metrics.
 */
export function parseProbs(text: string): DisputeProbs | null {
  const block = text.match(PROB_BLOCK_RE)
  if (!block) return null

  const probs: DisputeProbs = {}
  for (const line of block[1].trim().split('\n')) {
    const m = line.match(PROB_LINE_RE)
    if (m) {
      const value = parseInt(m[2], 10)
      if (!Number.isNaN(value)) probs[m[1]] = value
    }
  }
  return Object.keys(probs).length ? probs : null
}

/**
 * Strips internal markers from the model output so only display markdown remains:
 * the prob block, stray PROB markers, bare metric lines, blockquote carets, and
 * collapses runs of blank lines.
 */
export function cleanText(input: string): string {
  let t = input
  // Whole prob block (with or without a trailing newline / closing bracket).
  t = t.replace(/\[PROB_START\][\s\S]*?\[?PROB_END\]?\n?/g, '')
  // Any stray marker lines left behind.
  t = t.replace(/^\[?PROB_START\]?.*$/gm, '').replace(/^\[?PROB_END\]?.*$/gm, '')
  // Bare metric lines that escaped the block.
  t = t.replace(
    /^(ECONOMIC_DISPUTE|REVIEW_REMOVAL|REMOVAL_PROBABILITY|CASE_STRENGTH):\s*\d+%.*$/gm,
    ''
  )
  // Blockquote carets → plain text (spec: no blockquotes).
  t = t.replace(/^>\s?/gm, '')
  // Collapse 3+ newlines to a paragraph break.
  return t.replace(/\n{3,}/g, '\n\n').trim()
}
