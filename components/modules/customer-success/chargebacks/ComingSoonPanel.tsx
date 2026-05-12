'use client'

import { Sparkles } from 'lucide-react'

interface Props {
  title: string
  description: string
}

export function ComingSoonPanel({ title, description }: Props) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-[#E0DBD4] shadow-card p-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-mvr-sand-light mb-4">
        <Sparkles className="w-5 h-5 text-mvr-sand" />
      </div>
      <h3 className="font-display text-xl text-mvr-primary mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  )
}
