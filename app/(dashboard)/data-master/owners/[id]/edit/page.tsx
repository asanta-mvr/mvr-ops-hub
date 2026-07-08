import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { OwnerForm } from '@/components/modules/data-master/OwnerForm'

export const metadata: Metadata = { title: 'Edit Owner' }

export default async function EditOwnerPage({ params }: { params: { id: string } }) {
  const owner = await db.owner.findUnique({ where: { id: params.id } })
  if (!owner) notFound()

  // Legacy rows may only have `nickname`; split it as a fallback for first/last.
  const nameParts = owner.nickname.trim().split(/\s+/)
  const fallbackFirst = nameParts[0] ?? ''
  const fallbackLast = nameParts.slice(1).join(' ')

  const defaultValues = {
    firstName:          owner.firstName ?? fallbackFirst,
    lastName:           owner.lastName ?? fallbackLast,
    type:               owner.type            ?? '',
    status:             (owner.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
    category:           owner.category        ?? '',
    personalityScore:   owner.personalityScore   ?? 50,
    communicationScore: owner.communicationScore ?? 50,
    documentType:       owner.documentType    ?? '',
    documentNumber:     owner.documentNumber  ?? '',
    phone:              owner.phone           ?? '',
    address:            owner.address         ?? '',
    city:               owner.city            ?? '',
    state:              owner.state           ?? '',
    postalCode:         owner.postalCode      ?? '',
    country:            owner.country         ?? '',
    email:              owner.email           ?? '',
    otherEmail:         owner.otherEmail      ?? '',
    photoUrl:           owner.photoUrl        ?? '',
    linkedin:           owner.linkedin        ?? '',
    dateOfBirth:        owner.dateOfBirth ? owner.dateOfBirth.toISOString().slice(0, 10) : '',
    nationality:        owner.nationality     ?? '',
    language:           owner.language,
    siteUser:           owner.siteUser        ?? '',
    notes:              owner.notes           ?? '',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Link href="/data-master" className="hover:text-mvr-primary transition-colors">Data Master</Link>
          <span>/</span>
          <Link href="/data-master/owners" className="hover:text-mvr-primary transition-colors">Owners</Link>
          <span>/</span>
          <Link href={`/data-master/owners/${owner.id}`} className="hover:text-mvr-primary transition-colors truncate max-w-[160px]">
            {owner.nickname}
          </Link>
          <span>/</span>
          <span>Edit</span>
        </nav>
        <h1 className="text-2xl font-display font-bold text-mvr-primary">Edit Owner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {owner.nickname} · <span className="font-mono text-xs">{owner.id}</span>
        </p>
      </div>

      <OwnerForm ownerId={owner.id} defaultValues={defaultValues} />
    </div>
  )
}
