import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Building' }

export default function NewBuildingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">New Building</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Phase 1 — Building form coming in the next sprint
        </p>
      </div>
    </div>
  )
}
