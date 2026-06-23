'use client'

import type { ReactNode } from 'react'

interface Props {
  title:     string
  subtitle?: string
  right?:    ReactNode
  children:  ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, right, children, className = '' }: Props) {
  return (
    <div className={`rounded-xl bg-white border border-[#E0DBD4] p-5 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-mvr-primary">{title}</h3>
          {subtitle ? <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
