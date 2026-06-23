import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canEdit, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getOrCreateConnection, isEnvManaged } from '@/lib/integrations/guesty'
import GuestyConnectionForm from '@/components/modules/integrations/guesty/GuestyConnectionForm'
import GuestyListingsTable from '@/components/modules/integrations/guesty/GuestyListingsTable'
import GuestyOwnersTable from '@/components/modules/integrations/guesty/GuestyOwnersTable'
import CollapsibleSection from '@/components/modules/integrations/guesty/CollapsibleSection'

export const metadata: Metadata = { title: 'Guesty · Integrations' }
export const dynamic = 'force-dynamic'

const LISTING_SELECT = {
  id: true,
  guestyId: true,
  title: true,
  nickname: true,
  propertyType: true,
  addressFull: true,
  accommodates: true,
  bedrooms: true,
  bathrooms: true,
  active: true,
  pictureUrl: true,
  createdAtGuesty: true,
  unitId: true,
  syncedAt: true,
}

const OWNER_SELECT = {
  id: true,
  guestyId: true,
  fullName: true,
  email: true,
  phone: true,
  ownerType: true,
  pictureUrl: true,
  listingCount: true,
  createdAtGuesty: true,
  ownerUniqueId: true,
  suggestedOwnerId: true,
  syncedAt: true,
  owner: { select: { id: true, nickname: true } },
}

const PAGE_SIZE = 50

export default async function GuestyIntegrationPage() {
  const session = await auth()
  await requireView(session, 'integrations')
  const editable = await canEdit(session, 'integrations')

  const connection = await getOrCreateConnection()
  const envManaged = isEnvManaged()

  const [listingRows, listingTotal, ownerRows, ownerTotal] = await Promise.all([
    db.guestyListing.findMany({
      select: LISTING_SELECT,
      orderBy: [{ createdAtGuesty: 'desc' }, { id: 'asc' }],
      take: PAGE_SIZE,
    }),
    db.guestyListing.count(),
    db.guestyOwner.findMany({
      select: OWNER_SELECT,
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      take: PAGE_SIZE,
    }),
    db.guestyOwner.count(),
  ])

  // Resolve suggested-owner names for the first page of owners.
  const suggestedIds = Array.from(
    new Set(ownerRows.map((o) => o.suggestedOwnerId).filter((v): v is string => !!v))
  )
  const suggestedOwners = suggestedIds.length
    ? await db.owner.findMany({ where: { id: { in: suggestedIds } }, select: { id: true, nickname: true } })
    : []
  const suggMap = new Map(suggestedOwners.map((o) => [o.id, o.nickname]))

  // Pass only safe connection fields to the client (never secret/token).
  const safeConnection = connection
    ? {
        id: connection.id,
        name: connection.name,
        clientId: connection.clientId,
        status: connection.status,
        lastError: connection.lastError,
        lastSyncAt: connection.lastSyncAt ? connection.lastSyncAt.toISOString() : null,
        lastSyncCount: connection.lastSyncCount,
        hasSecret: envManaged || Boolean(connection.clientSecret),
        envManaged,
      }
    : null

  const initialListings = listingRows.map((r) => ({
    ...r,
    bathrooms: r.bathrooms == null ? null : Number(r.bathrooms),
    createdAtGuesty: r.createdAtGuesty ? r.createdAtGuesty.toISOString() : null,
    syncedAt: r.syncedAt.toISOString(),
  }))

  const initialOwners = ownerRows.map((r) => ({
    ...r,
    suggestedOwnerName: r.suggestedOwnerId ? suggMap.get(r.suggestedOwnerId) ?? null : null,
    createdAtGuesty: r.createdAtGuesty ? r.createdAtGuesty.toISOString() : null,
    syncedAt: r.syncedAt.toISOString(),
  }))

  const connected = safeConnection?.status === 'connected'

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-mvr-primary"
        >
          <ChevronLeft className="size-4" />
          Integrations
        </Link>
        <h1 className="font-display mt-2 text-3xl text-mvr-primary">Guesty</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the Guesty Open API to pull every listing and owner — active and inactive — into the hub.
        </p>
      </div>

      <GuestyConnectionForm connection={safeConnection} editable={editable} envManaged={envManaged} />

      <div className="space-y-4">
        <CollapsibleSection title="Listings" count={listingTotal} subtitle="active & inactive" defaultOpen>
          <GuestyListingsTable
            initialRows={initialListings}
            initialTotal={listingTotal}
            connected={connected}
            lastSyncAt={safeConnection?.lastSyncAt ?? null}
            editable={editable}
            pageSize={PAGE_SIZE}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Owners" count={ownerTotal} subtitle="map to Data Master owners">
          <GuestyOwnersTable
            initialRows={initialOwners}
            initialTotal={ownerTotal}
            connected={connected}
            editable={editable}
            pageSize={PAGE_SIZE}
          />
        </CollapsibleSection>
      </div>
    </div>
  )
}
