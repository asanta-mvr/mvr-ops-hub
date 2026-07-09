'use client'

import { useState, type ReactNode } from 'react'
import { Info, FileText, Images, SlidersHorizontal } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Left-column tabs for the listing detail page: informational Guesty data in the
// first three tabs, editable/operational Data Master content in the fourth.
export function ListingDetailTabs({
  basicInfo,
  description,
  photos,
  dataMaster,
}: {
  basicInfo: ReactNode
  description: ReactNode
  photos: ReactNode
  dataMaster: ReactNode
}) {
  const [tab, setTab] = useState('basic')

  return (
    <Tabs value={tab} onValueChange={setTab} className="!flex-col w-full">
      <TabsList variant="line" className="h-12 w-full justify-start overflow-x-auto border-b border-[#E0DBD4] pb-2">
        <TabsTrigger value="basic" className="gap-2 px-4 text-sm">
          <Info className="h-4 w-4" />
          Basic Info
        </TabsTrigger>
        <TabsTrigger value="description" className="gap-2 px-4 text-sm">
          <FileText className="h-4 w-4" />
          Description
        </TabsTrigger>
        <TabsTrigger value="photos" className="gap-2 px-4 text-sm">
          <Images className="h-4 w-4" />
          Photos
        </TabsTrigger>
        <TabsTrigger value="data" className="gap-2 px-4 text-sm">
          <SlidersHorizontal className="h-4 w-4" />
          Data Master
        </TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">{basicInfo}</TabsContent>
      <TabsContent value="description" className="space-y-4">{description}</TabsContent>
      <TabsContent value="photos" className="space-y-4">{photos}</TabsContent>
      <TabsContent value="data" className="space-y-4">{dataMaster}</TabsContent>
    </Tabs>
  )
}
