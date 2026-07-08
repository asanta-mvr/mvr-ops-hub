// Renders a document type's naming template into a Drive file name. Pure — no
// I/O. Tokens: {type} {building} {unit} {owner} {legalOwner} {issueDate}
// {expiryDate} {version}. Dates format as YYYY-MM-DD. The file extension is
// appended by the caller (not part of the template).

export interface NamingContext {
  type:        string
  building?:   string | null
  unit?:       string | null
  owner?:      string | null
  legalOwner?: string | null
  issueDate?:  Date | null
  expiryDate?: Date | null
  version?:    number
}

const DEFAULT_TEMPLATE = '{type} - {issueDate}'

function fmtDate(d?: Date | null): string {
  if (!d) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function renderDocumentName(template: string | null | undefined, ctx: NamingContext): string {
  const tpl = template && template.trim() ? template : DEFAULT_TEMPLATE
  const tokens: Record<string, string> = {
    type:       ctx.type ?? '',
    building:   ctx.building ?? '',
    unit:       ctx.unit ?? '',
    owner:      ctx.owner ?? '',
    legalOwner: ctx.legalOwner ?? '',
    issueDate:  fmtDate(ctx.issueDate),
    expiryDate: fmtDate(ctx.expiryDate),
    version:    ctx.version != null ? `v${ctx.version}` : '',
  }
  let out = tpl.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? '')
  // Tidy up separators left by empty tokens (e.g. "COI -  - 2026" → "COI - 2026").
  out = out
    .replace(/\s*-\s*(?=-)/g, '')
    .replace(/^[\s\-]+|[\s\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return out || ctx.type || 'document'
}
