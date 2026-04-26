import type { Metadata } from 'next'
import Link from 'next/link'
import { OwnerForm } from '@/components/modules/data-master/OwnerForm'

export const metadata: Metadata = { title: 'New Owner' }

export default function NewOwnerPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Link href="/data-master" className="hover:text-mvr-primary transition-colors">Data Master</Link>
          <span>/</span>
          <Link href="/data-master/owners" className="hover:text-mvr-primary transition-colors">Owners</Link>
          <span>/</span>
          <span>New Owner</span>
        </nav>
        <h1 className="text-2xl font-display font-bold text-mvr-primary">New Owner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new property owner to the MVR portfolio.
        </p>
      </div>

      <OwnerForm />
    </div>
  )
}
