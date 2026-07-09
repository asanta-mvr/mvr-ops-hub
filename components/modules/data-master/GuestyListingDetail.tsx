import { MapPin, Users, BedDouble, Bath, Ruler, Lock, Wifi, KeyRound } from 'lucide-react'
import CollapsibleCard from './CollapsibleCard'

// Presentational, read-only render of the Guesty-derived listing detail, sourced
// from GuestyListing.raw. Sensitive operational fields are shown only when
// `privileged` is true (see docs/guesty-listing-api-map.md B.3).

type Raw = Record<string, unknown>

function rec(v: unknown): Raw | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
/** Walk a dotted path, returning the value or undefined. */
function pick(raw: Raw, path: string): unknown {
  let cur: unknown = raw
  for (const key of path.split('.')) {
    const r = rec(cur)
    if (!r) return undefined
    cur = r[key]
  }
  return cur
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <CollapsibleCard title={title}>{children}</CollapsibleCard>
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-mvr-steel">{icon}</span>
      <span className="text-sm text-mvr-olive">
        <span className="font-medium">{value}</span> <span className="text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

export default function GuestyListingDetail({
  raw,
  privileged,
  part = 'basic',
}: {
  raw: Raw
  privileged: boolean
  // Which group of sections to render (the listing detail splits these across tabs).
  // 'basic' = Overview/Address/Pricing · 'description' = Description/Amenities · 'access' = restricted.
  part?: 'basic' | 'description' | 'access'
}) {
  const amenities = (Array.isArray(raw.amenities) ? raw.amenities : []).filter(
    (a): a is string => typeof a === 'string'
  )

  const descKeys: Array<[string, string]> = [
    ['summary', 'Summary'],
    ['space', 'The space'],
    ['access', 'Guest access'],
    ['neighborhood', 'Neighborhood'],
    ['transit', 'Getting around'],
    ['houseRules', 'House rules'],
  ]

  const currency = str(pick(raw, 'prices.currency')) ?? ''
  const fmtMoney = (v: number | null) => (v == null ? null : `${currency} ${v.toLocaleString()}`)

  return (
    <div className="space-y-4">
      {/* Key facts */}
      {part === 'basic' && (
      <Section title="Overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {num(raw.accommodates) != null && (
            <Fact icon={<Users className="size-4" />} label="guests" value={String(num(raw.accommodates))} />
          )}
          {num(raw.bedrooms) != null && (
            <Fact icon={<BedDouble className="size-4" />} label="bedrooms" value={String(num(raw.bedrooms))} />
          )}
          {num(raw.bathrooms) != null && (
            <Fact icon={<Bath className="size-4" />} label="bathrooms" value={String(num(raw.bathrooms))} />
          )}
          {num(raw.beds) != null && (
            <Fact icon={<BedDouble className="size-4" />} label="beds" value={String(num(raw.beds))} />
          )}
          {num(raw.areaSquareFeet) != null && (
            <Fact icon={<Ruler className="size-4" />} label="sq ft" value={String(num(raw.areaSquareFeet))} />
          )}
        </div>
      </Section>
      )}

      {/* Address */}
      {part === 'basic' && str(pick(raw, 'address.full')) && (
        <Section title="Address">
          <div className="flex items-start gap-2 text-sm text-mvr-olive">
            <MapPin className="mt-0.5 size-4 shrink-0 text-mvr-steel" />
            <div>
              <p>{str(pick(raw, 'address.full'))}</p>
              {str(pick(raw, 'address.buildingName')) && (
                <p className="text-xs text-muted-foreground">Building: {str(pick(raw, 'address.buildingName'))}</p>
              )}
              {str(raw.timezone) && <p className="text-xs text-muted-foreground">{str(raw.timezone)}</p>}
            </div>
          </div>
        </Section>
      )}

      {/* Descriptions */}
      {part === 'description' && descKeys.some(([k]) => str(pick(raw, `publicDescription.${k}`))) && (
        <Section title="Description">
          <div className="space-y-3">
            {descKeys.map(([k, label]) => {
              const v = str(pick(raw, `publicDescription.${k}`))
              if (!v) return null
              return (
                <div key={k}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-mvr-olive">{v}</p>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Amenities */}
      {part === 'description' && amenities.length > 0 && (
        <Section title={`Amenities (${amenities.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span key={a} className="rounded-full bg-mvr-sand-light px-2.5 py-0.5 text-xs text-mvr-olive">
                {a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Pricing & terms */}
      {part === 'basic' && (
      <Section title="Pricing & terms">
        <div className="grid grid-cols-2 gap-3 text-sm text-mvr-olive sm:grid-cols-3">
          {fmtMoney(num(pick(raw, 'prices.basePrice'))) && (
            <p>
              <span className="text-muted-foreground">Base</span> {fmtMoney(num(pick(raw, 'prices.basePrice')))}
            </p>
          )}
          {fmtMoney(num(pick(raw, 'prices.cleaningFee'))) && (
            <p>
              <span className="text-muted-foreground">Cleaning</span> {fmtMoney(num(pick(raw, 'prices.cleaningFee')))}
            </p>
          )}
          {fmtMoney(num(pick(raw, 'prices.securityDepositFee'))) && (
            <p>
              <span className="text-muted-foreground">Deposit</span>{' '}
              {fmtMoney(num(pick(raw, 'prices.securityDepositFee')))}
            </p>
          )}
          {num(pick(raw, 'terms.minNights')) != null && (
            <p>
              <span className="text-muted-foreground">Min nights</span> {num(pick(raw, 'terms.minNights'))}
            </p>
          )}
          {num(pick(raw, 'terms.maxNights')) != null && (
            <p>
              <span className="text-muted-foreground">Max nights</span> {num(pick(raw, 'terms.maxNights'))}
            </p>
          )}
          {str(raw.defaultCheckInTime) && (
            <p>
              <span className="text-muted-foreground">Check-in</span> {str(raw.defaultCheckInTime)}
            </p>
          )}
          {str(raw.defaultCheckOutTime) && (
            <p>
              <span className="text-muted-foreground">Check-out</span> {str(raw.defaultCheckOutTime)}
            </p>
          )}
        </div>
      </Section>
      )}

      {/* Sensitive — privileged roles only */}
      {part === 'access' && privileged &&
        (str(raw.wifiName) || str(raw.wifiPassword) || str(raw.doorCode) || str(raw.lockCode)) && (
          <Section title="Access (restricted)">
            <div className="space-y-2 text-sm text-mvr-olive">
              {str(raw.wifiName) && (
                <Fact icon={<Wifi className="size-4" />} label={`Wi-Fi`} value={str(raw.wifiName)!} />
              )}
              {str(raw.wifiPassword) && (
                <Fact icon={<Wifi className="size-4" />} label="Wi-Fi password" value={str(raw.wifiPassword)!} />
              )}
              {str(raw.doorCode) && (
                <Fact icon={<KeyRound className="size-4" />} label="door code" value={str(raw.doorCode)!} />
              )}
              {str(raw.lockCode) && (
                <Fact icon={<Lock className="size-4" />} label="lock code" value={str(raw.lockCode)!} />
              )}
            </div>
          </Section>
        )}
    </div>
  )
}
