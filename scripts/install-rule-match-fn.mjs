// Installs the Postgres function used by the live n8n workflow to match Stripe events
// against public.notification_rules. Idempotent.
//
// Run: node scripts/install-rule-match-fn.mjs
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DROP_INT = `DROP FUNCTION IF EXISTS public.match_notification_rule(text, text, text, int);`
const DROP_BIGINT = `DROP FUNCTION IF EXISTS public.match_notification_rule(text, text, text, bigint);`

const CREATE_SQL = `
CREATE OR REPLACE FUNCTION public.match_notification_rule(
  p_reason text,
  p_risk_level text,
  p_status text,
  p_amount_cents bigint
) RETURNS TABLE (rule_id text, channel text, priority text)
LANGUAGE sql STABLE
AS $func$
  SELECT id, channel, priority
  FROM public.notification_rules
  WHERE enabled = true
    AND (criteria->>'reason'    IS NULL OR criteria->>'reason'    = p_reason)
    AND (criteria->>'riskLevel' IS NULL OR criteria->>'riskLevel' = p_risk_level)
    AND (criteria->>'status'    IS NULL OR criteria->>'status'    = p_status)
    AND (COALESCE((criteria->>'minAmountCents')::bigint, 0) <= COALESCE(p_amount_cents, 0))
  ORDER BY
    CASE priority WHEN 'p1' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
    "createdAt" DESC
  LIMIT 1;
$func$;
`

const GRANT_SQL = `GRANT EXECUTE ON FUNCTION public.match_notification_rule(text, text, text, bigint) TO PUBLIC;`

async function main() {
  console.log('Installing public.match_notification_rule()...')
  await db.$executeRawUnsafe(DROP_INT)
  await db.$executeRawUnsafe(DROP_BIGINT)
  await db.$executeRawUnsafe(CREATE_SQL)
  await db.$executeRawUnsafe(GRANT_SQL)
  console.log('Function installed. Verifying with a smoke call...')

  const rows = await db.$queryRawUnsafe(
    `SELECT * FROM public.match_notification_rule($1, $2, $3, $4)`,
    'insufficient_funds',
    'normal',
    'failed',
    50000
  )
  console.log('Smoke call result:', rows)
  console.log('✅ Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
