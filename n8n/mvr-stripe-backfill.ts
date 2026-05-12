import {
  workflow,
  node,
  trigger,
  splitInBatches,
  nextBatch,
  newCredential,
  expr,
} from '@n8n/workflow-sdk'

const runBackfillTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Backfill', position: [240, 400] },
  output: [{}],
})

const backfillConfig = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Backfill Config',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: '1',
            name: 'sinceUnix',
            type: 'number',
            value: expr('{{ $now.minus({ days: 365 }).toUnixInteger() }}'),
          },
          {
            id: '2',
            name: 'sinceLabel',
            type: 'string',
            value: expr('{{ $now.minus({ days: 365 }).toFormat("yyyy-MM-dd") }}'),
          },
        ],
      },
      includeOtherFields: false,
    },
    position: [440, 400],
  },
  output: [{ sinceUnix: 1715454800, sinceLabel: '2025-05-11' }],
})

const fetchCharges = node({
  type: 'n8n-nodes-base.stripe',
  version: 1,
  config: {
    name: 'Fetch All Charges',
    parameters: {
      resource: 'charge',
      operation: 'getAll',
      returnAll: true,
    },
    credentials: { stripeApi: newCredential('MVR Stripe API') },
    position: [640, 400],
  },
  output: [
    {
      id: 'ch_3RPlaceholder',
      amount: 12500,
      currency: 'usd',
      status: 'succeeded',
      created: 1735454800,
      livemode: true,
      payment_intent: 'pi_3RPlaceholder',
      customer: 'cus_PlaceholderId',
      outcome: { risk_level: 'normal', risk_score: 16, reason: null },
      metadata: { booking_id: 'BK-12345' },
    },
  ],
})

const filterRecentCharges = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Drop Charges Older Than 12mo',
    parameters: {
      conditions: {
        options: { caseSensitive: true, typeValidation: 'strict' },
        conditions: [
          {
            id: '1',
            leftValue: expr('{{ $json.created }}'),
            operator: { type: 'number', operation: 'gte' },
            rightValue: expr('{{ $("Backfill Config").first().json.sinceUnix }}'),
          },
        ],
        combinator: 'and',
      },
    },
    position: [840, 400],
  },
  output: [
    {
      id: 'ch_3RPlaceholder',
      amount: 12500,
      currency: 'usd',
      status: 'succeeded',
      created: 1735454800,
      livemode: true,
    },
  ],
})

const loopCharges = splitInBatches({
  version: 3,
  config: {
    name: 'Loop Charges',
    parameters: { batchSize: 50 },
    position: [1040, 400],
  },
})

const upsertCharge = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Upsert Charge',
    parameters: {
      operation: 'executeQuery',
      query:
        "INSERT INTO risk_agent.transactions " +
        "(id, payment_intent, customer_id, booking_id, amount_cents, currency, status, " +
        " risk_level, risk_score, outcome_reason, livemode, created_at, raw) " +
        "SELECT $1, " +
        "       NULLIF($2, 'null'), " +
        "       NULLIF($3, 'null'), " +
        "       NULLIF($4, 'null'), " +
        "       $5::int, " +
        "       $6, " +
        "       $7, " +
        "       NULLIF($8, 'null'), " +
        "       NULLIF($9, 'null')::int, " +
        "       NULLIF($10, 'null'), " +
        "       $11::bool, " +
        "       to_timestamp($12::bigint), " +
        "       $13::jsonb " +
        "WHERE $1 LIKE 'ch_%' " +
        "ON CONFLICT (id) DO UPDATE SET " +
        "  status = EXCLUDED.status, " +
        "  risk_level = EXCLUDED.risk_level, " +
        "  risk_score = EXCLUDED.risk_score, " +
        "  outcome_reason = EXCLUDED.outcome_reason, " +
        "  raw = EXCLUDED.raw;",
      options: {
        queryReplacement: expr(
          '{{ $json.id }},' +
            '{{ $json.payment_intent || null }},' +
            '{{ $json.customer || null }},' +
            '{{ ($json.metadata && $json.metadata.booking_id) || null }},' +
            '{{ $json.amount }},' +
            '{{ $json.currency }},' +
            '{{ $json.status }},' +
            '{{ ($json.outcome && $json.outcome.risk_level) || null }},' +
            '{{ ($json.outcome && $json.outcome.risk_score) || null }},' +
            '{{ ($json.outcome && $json.outcome.reason) || null }},' +
            '{{ $json.livemode }},' +
            '{{ $json.created }},' +
            '{{ JSON.stringify($json) }}'
        ),
      },
    },
    credentials: { postgres: newCredential('MVR Cloud SQL risk_agent') },
    position: [1240, 480],
  },
  output: [{ id: 'ch_3RPlaceholder' }],
})

const fetchDisputes = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Disputes (Stripe REST)',
    parameters: {
      method: 'GET',
      url: 'https://api.stripe.com/v1/disputes',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'stripeApi',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [{ name: 'limit', value: '100' }],
      },
    },
    credentials: { stripeApi: newCredential('MVR Stripe API') },
    executeOnce: true,
    position: [1440, 320],
  },
  output: [
    {
      object: 'list',
      data: [
        {
          id: 'dp_1RPlaceholder',
          charge: 'ch_3RPlaceholder',
          payment_intent: 'pi_3RPlaceholder',
          reason: 'fraudulent',
          amount: 12500,
          currency: 'usd',
          status: 'needs_response',
          created: 1735540800,
          livemode: true,
          evidence_details: { due_by: 1736400000 },
        },
      ],
      has_more: false,
    },
  ],
})

const splitDisputes = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: 'Split Disputes',
    parameters: {
      fieldToSplitOut: 'data',
      include: 'noOtherFields',
    },
    position: [1640, 320],
  },
  output: [
    {
      id: 'dp_1RPlaceholder',
      charge: 'ch_3RPlaceholder',
      reason: 'fraudulent',
      amount: 12500,
      currency: 'usd',
      status: 'needs_response',
      created: 1735540800,
      livemode: true,
    },
  ],
})

const loopDisputes = splitInBatches({
  version: 3,
  config: {
    name: 'Loop Disputes',
    parameters: { batchSize: 50 },
    position: [1840, 320],
  },
})

const upsertDispute = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Upsert Dispute',
    parameters: {
      operation: 'executeQuery',
      query:
        "INSERT INTO risk_agent.disputes " +
        "(id, charge_id, payment_intent, reason, amount_cents, currency, status, " +
        " evidence_due_by, livemode, created_at, updated_at, raw) " +
        "SELECT $1, " +
        "       NULLIF($2, 'null'), " +
        "       NULLIF($3, 'null'), " +
        "       $4, " +
        "       $5::int, " +
        "       $6, " +
        "       $7, " +
        "       CASE WHEN NULLIF($8, 'null') IS NOT NULL AND $8 <> '' THEN to_timestamp(CAST($8 AS bigint)) ELSE NULL END, " +
        "       $9::bool, " +
        "       to_timestamp($10::bigint), " +
        "       NOW(), " +
        "       $11::jsonb " +
        "ON CONFLICT (id) DO UPDATE SET " +
        "  status = EXCLUDED.status, " +
        "  reason = EXCLUDED.reason, " +
        "  evidence_due_by = EXCLUDED.evidence_due_by, " +
        "  updated_at = NOW(), " +
        "  raw = EXCLUDED.raw;",
      options: {
        queryReplacement: expr(
          '{{ $json.id }},' +
            '{{ $json.charge || null }},' +
            '{{ $json.payment_intent || null }},' +
            '{{ $json.reason }},' +
            '{{ $json.amount }},' +
            '{{ $json.currency }},' +
            '{{ $json.status }},' +
            '{{ ($json.evidence_details && $json.evidence_details.due_by) || null }},' +
            '{{ $json.livemode }},' +
            '{{ $json.created }},' +
            '{{ JSON.stringify($json) }}'
        ),
      },
    },
    credentials: { postgres: newCredential('MVR Cloud SQL risk_agent') },
    position: [2040, 400],
  },
  output: [{ id: 'dp_1RPlaceholder' }],
})

const aggregateCounts = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Aggregate Counts',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: '1',
            name: 'chargesUpserted',
            type: 'number',
            value: expr('{{ $("Drop Charges Older Than 12mo").all().length }}'),
          },
          {
            id: '2',
            name: 'disputesUpserted',
            type: 'number',
            value: expr('{{ $("Split Disputes").all().length }}'),
          },
          {
            id: '3',
            name: 'sinceLabel',
            type: 'string',
            value: expr('{{ $("Backfill Config").first().json.sinceLabel }}'),
          },
        ],
      },
      includeOtherFields: false,
    },
    executeOnce: true,
    position: [2240, 320],
  },
  output: [{ chargesUpserted: 1230, disputesUpserted: 12, sinceLabel: '2025-05-11' }],
})

const slackBackfillComplete = node({
  type: 'n8n-nodes-base.slack',
  version: 2.4,
  config: {
    name: 'Slack Backfill Complete',
    parameters: {
      resource: 'message',
      operation: 'post',
      authentication: 'oAuth2',
      select: 'channel',
      channelId: { __rl: true, mode: 'id', value: 'C098R8ZMZTL' },
      messageType: 'text',
      text: expr(
        ':white_check_mark: MVR Stripe Backfill complete. ' +
          'Charges upserted: {{ $json.chargesUpserted }}. ' +
          'Disputes upserted: {{ $json.disputesUpserted }}. ' +
          'Window since {{ $json.sinceLabel }}.'
      ),
      otherOptions: { mrkdwn: true, includeLinkToWorkflow: false },
    },
    credentials: { slackOAuth2Api: newCredential('MVR Slack OAuth2') },
    executeOnce: true,
    position: [2440, 320],
  },
  output: [{ ok: true }],
})

export default workflow('mvr-stripe-backfill', 'MVR Stripe Backfill (12mo)')
  .add(runBackfillTrigger)
  .to(backfillConfig)
  .to(fetchCharges)
  .to(filterRecentCharges)
  .to(
    loopCharges
      .onDone(
        fetchDisputes
          .to(splitDisputes)
          .to(
            loopDisputes
              .onDone(aggregateCounts.to(slackBackfillComplete))
              .onEachBatch(upsertDispute.to(nextBatch(loopDisputes)))
          )
      )
      .onEachBatch(upsertCharge.to(nextBatch(loopCharges)))
  )
