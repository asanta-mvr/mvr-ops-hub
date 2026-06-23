// Generates an Excalidraw file comparing the current vs scalable architecture
// of the MVR Ops Hub. Open the output at https://excalidraw.com → File → Open.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, 'architecture-comparison.excalidraw');

const COLORS = {
  navy:        '#1E2D40',
  navyLight:   '#E8EEF4',
  sand:        '#CEC4B6',
  sandLight:   '#F5F1EB',
  steel:       '#A2B4C0',
  steelLight:  '#EBF0F4',
  cream:       '#F7F4F0',
  neutral:     '#EDEAE4',
  success:     '#2D6A4F',
  successLight:'#E6F4EC',
  warning:     '#B5541C',
  warningLight:'#FDF0E6',
  danger:      '#8B2030',
  dangerLight: '#FDEEF0',
  white:       '#FFFFFF',
  transparent: 'transparent',
};

let seed = 1;
const elements = [];
const now = Date.now();

const base = (id, type, x, y, w, h, extra = {}) => ({
  id,
  type,
  x,
  y,
  width: w,
  height: h,
  angle: 0,
  strokeColor: COLORS.navy,
  backgroundColor: COLORS.transparent,
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  seed: seed++,
  version: 1,
  versionNonce: seed++,
  isDeleted: false,
  groupIds: [],
  frameId: null,
  roundness: null,
  boundElements: [],
  updated: now,
  link: null,
  locked: false,
  ...extra,
});

const rect = (id, x, y, w, h, opts = {}) => {
  const { fill = COLORS.white, stroke = COLORS.navy, dashed = false, rounded = true } = opts;
  return base(id, 'rectangle', x, y, w, h, {
    backgroundColor: fill,
    strokeColor: stroke,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roundness: rounded ? { type: 3 } : null,
  });
};

const boxWithLabel = (id, x, y, w, h, label, opts = {}) => {
  const fontSize = opts.fontSize || 16;
  const { fill = COLORS.white, stroke = COLORS.navy, dashed = false, rounded = true, textColor } = opts;
  const r = rect(id, x, y, w, h, { fill, stroke, dashed, rounded });
  const textId = `${id}-t`;
  r.boundElements = [{ type: 'text', id: textId }];
  elements.push(r);
  const lines = label.split('\n').length;
  const approxH = lines * fontSize * 1.25;
  const t = base(textId, 'text', x, y + (h - approxH) / 2, w, approxH, {
    strokeColor: textColor || stroke,
    backgroundColor: COLORS.transparent,
    fontSize,
    fontFamily: 2, // Helvetica
    text: label,
    originalText: label,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: id,
    lineHeight: 1.25,
    baseline: Math.round(fontSize * 0.9),
  });
  elements.push(t);
};

const text = (x, y, content, opts = {}) => {
  const fontSize = opts.fontSize || 16;
  const color = opts.color || COLORS.navy;
  const align = opts.align || 'left';
  const lines = content.split('\n').length;
  const w = opts.width || Math.max(...content.split('\n').map(s => s.length)) * fontSize * 0.55;
  const h = lines * fontSize * 1.25;
  const t = base(`txt-${seed}`, 'text', x, y, w, h, {
    strokeColor: color,
    backgroundColor: COLORS.transparent,
    fontSize,
    fontFamily: opts.family || 2,
    text: content,
    originalText: content,
    textAlign: align,
    verticalAlign: 'top',
    containerId: null,
    lineHeight: 1.25,
    baseline: Math.round(fontSize * 0.9),
  });
  elements.push(t);
  return t.id;
};

const arrow = (fromId, toId, opts = {}) => {
  const stroke = opts.stroke || COLORS.navy;
  const dashed = opts.dashed || false;
  const id = `arr-${seed}`;
  const a = base(id, 'arrow', 0, 0, 100, 0, {
    strokeColor: stroke,
    backgroundColor: COLORS.transparent,
    strokeStyle: dashed ? 'dashed' : 'solid',
    strokeWidth: opts.strokeWidth || 2,
    roundness: { type: 2 },
    points: [[0, 0], [100, 0]],
    lastCommittedPoint: null,
    startBinding: { elementId: fromId, focus: 0, gap: 6 },
    endBinding: { elementId: toId, focus: 0, gap: 6 },
    startArrowhead: null,
    endArrowhead: 'arrow',
  });
  elements.push(a);
  const fromEl = elements.find(e => e.id === fromId);
  const toEl = elements.find(e => e.id === toId);
  if (fromEl) fromEl.boundElements = [...(fromEl.boundElements || []), { id, type: 'arrow' }];
  if (toEl)   toEl.boundElements   = [...(toEl.boundElements || []),   { id, type: 'arrow' }];
};

// ============================================================================
// LAYOUT
// ============================================================================

// Background panels
elements.push(rect('panel-cur', 20, 20, 1100, 1000, {
  fill: COLORS.warningLight, stroke: COLORS.warning, dashed: true, rounded: true,
}));
elements.push(rect('panel-new', 1160, 20, 1100, 1000, {
  fill: COLORS.successLight, stroke: COLORS.success, dashed: true, rounded: true,
}));

// Titles
text(60, 40, 'ARQUITECTURA ACTUAL (As-is)', { fontSize: 28, color: COLORS.warning });
text(60, 80, 'Single region · DB pública · Sin cache · Webhooks síncronos', {
  fontSize: 14, color: COLORS.navy,
});

text(1200, 40, 'ARQUITECTURA ESCALABLE (To-be)', { fontSize: 28, color: COLORS.success });
text(1200, 80, 'Fluid Compute · Rate-limit · Queues · Pooler · Cache', {
  fontSize: 14, color: COLORS.navy,
});

// ============================================================================
// CURRENT (left side)
// ============================================================================
boxWithLabel('cur-users', 460, 130, 220, 60, 'Usuarios (10–30 hoy)\n→ 100+ próximamente', {
  fill: COLORS.white, stroke: COLORS.navy, fontSize: 14,
});

boxWithLabel('cur-vercel', 380, 230, 380, 90,
  'Vercel — Next.js 14 (single region)\nAPI Routes síncronas\nPrismaClient por function',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 14 }
);

boxWithLabel('cur-db', 70, 400, 230, 110,
  'Cloud SQL Postgres\nIP pública 34.26.x.x\n⚠ Sin pooler de conexiones',
  { fill: COLORS.dangerLight, stroke: COLORS.danger, fontSize: 13 }
);

boxWithLabel('cur-bq', 320, 400, 210, 110,
  'BigQuery\nQuery directa\nen cada request',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('cur-gcs', 550, 400, 190, 110,
  'GCS\nSigned URLs',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 14 }
);

boxWithLabel('cur-int', 760, 400, 320, 110,
  'Integraciones síncronas\nGuesty · Breezeway · Stripe\nSlack · Brivo · SuiteOp · Conduit',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('cur-smtp', 70, 580, 230, 90,
  'Gmail SMTP\n⚠ Cap ~500 emails/día',
  { fill: COLORS.dangerLight, stroke: COLORS.danger, fontSize: 13 }
);

boxWithLabel('cur-n8n', 320, 580, 210, 90,
  'n8n (externo)\nwebhooks',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 14 }
);

boxWithLabel('cur-redis', 550, 580, 190, 90,
  'Redis (opcional)\n⚠ Solo localhost\nSin cache en prod',
  { fill: COLORS.dangerLight, stroke: COLORS.danger, fontSize: 12 }
);

boxWithLabel('cur-jwt', 760, 580, 320, 90,
  'NextAuth JWT-only\n⚠ Sesiones no revocables\n⚠ Sin rate-limit en login',
  { fill: COLORS.dangerLight, stroke: COLORS.danger, fontSize: 12 }
);

// Arrows (current) — red dashed for problematic
arrow('cur-users', 'cur-vercel');
arrow('cur-vercel', 'cur-db',    { stroke: COLORS.danger, dashed: true, strokeWidth: 3 });
arrow('cur-vercel', 'cur-bq');
arrow('cur-vercel', 'cur-gcs');
arrow('cur-vercel', 'cur-int');
arrow('cur-vercel', 'cur-smtp',  { stroke: COLORS.danger, dashed: true });
arrow('cur-vercel', 'cur-n8n');
arrow('cur-vercel', 'cur-redis', { stroke: COLORS.danger, dashed: true });

// Issues banner
elements.push(rect('cur-issues', 50, 720, 1040, 270, {
  fill: COLORS.dangerLight, stroke: COLORS.danger, rounded: true,
}));
text(70, 735, '⚠  RIESGOS HOY (si escalas a 100+ usuarios concurrentes)', {
  fontSize: 18, color: COLORS.danger,
});
text(70, 775,
  '①  Postgres sin pooler → cada Vercel Function abre conexión nueva\n     · Cloud SQL ~100 conexiones máx; bursts las agotan en segundos.\n②  IP pública del DB → superficie de ataque + egress + sin VPC.\n③  Sin Redis en prod → no hay rate-limit ni cache de BigQuery.\n④  Webhooks (Stripe/Breezeway/Guesty) procesados síncronos →\n     timeouts y reintentos duplicados que escriben dos veces.',
  { fontSize: 12, color: COLORS.navy }
);
text(560, 775,
  '⑤  Gmail SMTP con cap diario → invitaciones, briefs y alertas fallan.\n⑥  Audit logs escriben en cada request a la misma DB → contención I/O.\n⑦  JWT sin invalidación → no puedes forzar logout si un usuario sale.\n⑧  BigQuery directo desde la UI → costos suben linealmente con users.\n⑨  Single region (US-East) → latencia alta fuera de Miami.\n⑩  Sin observability/alerts → te enteras cuando el usuario reclama.',
  { fontSize: 12, color: COLORS.navy }
);

// ============================================================================
// SCALABLE (right side)
// ============================================================================
boxWithLabel('new-users', 1620, 130, 240, 60,
  'Usuarios + Vercel BotID',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 14 }
);

boxWithLabel('new-edge', 1490, 220, 500, 70,
  'Vercel Edge + Routing Middleware\nRate-limit por user/IP · BotID · Auth check',
  { fill: COLORS.steelLight, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('new-funcs', 1490, 320, 500, 70,
  'Vercel Functions — Fluid Compute (Node 24)\nReúsa instancias · Graceful shutdown · Multi-region',
  { fill: COLORS.cream, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('new-cache', 1200, 420, 220, 110,
  'Upstash Redis\n• Rate-limit\n• Sessions\n• Hot cache BQ',
  { fill: COLORS.successLight, stroke: COLORS.success, fontSize: 13 }
);

boxWithLabel('new-pool', 1440, 420, 220, 110,
  'Prisma Accelerate\n+ PgBouncer\n• Pool conexiones\n• Edge cache',
  { fill: COLORS.successLight, stroke: COLORS.success, fontSize: 13 }
);

boxWithLabel('new-queue', 1680, 420, 220, 110,
  'Vercel Queues\n• Webhooks async\n• Audit logs\n• PDFs · Emails',
  { fill: COLORS.successLight, stroke: COLORS.success, fontSize: 13 }
);

boxWithLabel('new-ai', 1920, 420, 220, 110,
  'AI Gateway\nBriefs IA\n(opcional)\nFallbacks + ZDR',
  { fill: COLORS.successLight, stroke: COLORS.success, fontSize: 13 }
);

boxWithLabel('new-db', 1200, 580, 220, 90,
  'Cloud SQL\nPrivate IP + VPC\nConnector',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('new-bq', 1440, 580, 220, 90,
  'BigQuery\nTTL cache (Redis)\nResultados pre-agregados',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 12 }
);

boxWithLabel('new-gcs', 1680, 580, 220, 90,
  'GCS + Edge CDN\nSigned URLs (1h)',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 13 }
);

boxWithLabel('new-mail', 1920, 580, 220, 90,
  'Resend / SendGrid\nSin cap diario\nDKIM + tracking',
  { fill: COLORS.white, stroke: COLORS.navy, fontSize: 12 }
);

boxWithLabel('new-obs', 1490, 700, 500, 60,
  'Sentry · Vercel Analytics · Logs estructurados · Alerts',
  { fill: COLORS.steelLight, stroke: COLORS.navy, fontSize: 13 }
);

// Arrows (scalable)
arrow('new-users', 'new-edge');
arrow('new-edge',  'new-funcs');
arrow('new-funcs', 'new-cache');
arrow('new-funcs', 'new-pool');
arrow('new-funcs', 'new-queue');
arrow('new-funcs', 'new-ai');
arrow('new-pool',  'new-db');
arrow('new-funcs', 'new-bq');
arrow('new-funcs', 'new-gcs');
arrow('new-queue', 'new-mail');
arrow('new-queue', 'new-bq');
arrow('new-queue', 'new-gcs');

// Benefits banner
elements.push(rect('new-wins', 1180, 790, 1060, 200, {
  fill: COLORS.successLight, stroke: COLORS.success, rounded: true,
}));
text(1200, 805, '✓  CÓMO ESTO TE LIBERA DE LOS RIESGOS', {
  fontSize: 18, color: COLORS.success,
});
text(1200, 845,
  '①  PgBouncer / Prisma Accelerate → 1.000 funciones con 50 conexiones reales.\n②  Cloud SQL en IP privada vía VPC Connector → sin internet pública.\n③  Upstash Redis serverless → rate-limit 100 req/min por usuario y cache.\n④  Queues async → webhooks responden 200 en <100ms; dedupe por idempotencia.',
  { fontSize: 12, color: COLORS.navy }
);
text(1720, 845,
  '⑤  Resend o SendGrid → 50k+ emails/mes sin tocar Gmail.\n⑥  Audit logs y emails vía queue → ya no bloquean el response.\n⑦  Sentry + alerts → ves el spike antes que el usuario lo reporte.\n⑧  Fluid Compute reutiliza instancias → cold start casi nulo.',
  { fontSize: 12, color: COLORS.navy }
);

// ============================================================================
// MIGRATION ROADMAP banner
// ============================================================================
elements.push(rect('migration', 20, 1040, 2240, 220, {
  fill: COLORS.navyLight, stroke: COLORS.navy, rounded: true,
}));
text(40, 1055, 'RUTA DE MIGRACIÓN INCREMENTAL (sin downtime)', {
  fontSize: 20, color: COLORS.navy,
});
text(40, 1095,
  'Sprint 1 — Quick wins (1 semana):\n  • Conectar Prisma Accelerate (1 línea en DATABASE_URL).\n  • Habilitar Upstash Redis en prod + middleware de rate-limit.\n  • Migrar emails a Resend (mantener Gmail como fallback).\n  • Activar Vercel BotID en /api/v1/auth/*.',
  { fontSize: 13, color: COLORS.navy }
);
text(820, 1095,
  'Sprint 2 — Resiliencia (2 semanas):\n  • Mover webhooks (Stripe/Breezeway/Guesty) a Vercel Queues.\n  • Audit logs vía queue (no bloquean el response).\n  • Cache de BigQuery por (filtros, día) con TTL 15min.\n  • Cloud SQL → Private IP + VPC Connector.',
  { fontSize: 13, color: COLORS.navy }
);
text(1600, 1095,
  'Sprint 3 — Observability (1 semana):\n  • Sentry DSN poblado + source maps.\n  • Vercel Analytics + Speed Insights.\n  • Alert en Slack si p95 > 2s o error rate > 1%.\n  • Dashboard de cuotas (DB, BQ, emails).',
  { fontSize: 13, color: COLORS.navy }
);

const file = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#FAFAF7',
  },
  files: {},
};

writeFileSync(OUT, JSON.stringify(file, null, 2), 'utf8');
console.log(`Wrote ${OUT}  (${elements.length} elements)`);
