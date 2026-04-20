import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import BuildingForm from '@/components/modules/data-master/BuildingForm'

export const metadata: Metadata = { title: 'New Building' }

export default function NewBuildingPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link href="/data-master/buildings" className="hover:text-mvr-primary">Buildings</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">New</span>
        </nav>
        <h1 className="text-2xl font-bold text-mvr-primary">New Building</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a new property to the portfolio</p>
      </div>

      <BuildingForm />
    </div>
  )
}
