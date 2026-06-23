'use client'

// Tab shell for the Maintenance Report v2 module — 8 tabs mirroring the
// reference dashboard, scoped to real-maintenance tasks (subdept populated).
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import {
  Building2,
  ClipboardList,
  DollarSign,
  Home,
  LayoutDashboard,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  BuildingsAggregate,
  MaintenanceFilterOptions,
  MaintenanceFilters,
  MonthlyTrendAggregate,
  OverviewAggregate,
  OwnerCostsAggregate,
  SubdeptAggregate,
  TasksListAggregate,
  TeamAggregate,
} from '@/lib/maintenance/types'
import { OverviewTab } from './tabs/OverviewTab'
import { MonthlyTab } from './tabs/MonthlyTab'
import { SubdeptTab } from './tabs/SubdeptTab'
import { BuildingsTab } from './tabs/BuildingsTab'
import { UnitsDetailTab } from './tabs/UnitsDetailTab'
import { TeamTab } from './tabs/TeamTab'
import { OwnerCostsTab } from './tabs/OwnerCostsTab'
import { TasksTableTab } from './tabs/TasksTableTab'

interface Props {
  overviewFilters:    MaintenanceFilters
  overviewAggregate:  OverviewAggregate
  monthlyFilters:     MaintenanceFilters
  monthlyAggregate:   MonthlyTrendAggregate
  subdeptFilters:     MaintenanceFilters
  subdeptAggregate:   SubdeptAggregate
  buildingsFilters:   MaintenanceFilters
  buildingsAggregate: BuildingsAggregate
  unitsFilters:       MaintenanceFilters
  teamFilters:        MaintenanceFilters
  teamAggregate:      TeamAggregate
  costFilters:        MaintenanceFilters
  ownerCostsAggregate: OwnerCostsAggregate
  tasksFilters:       MaintenanceFilters
  tasksList:          TasksListAggregate
  filterOptions:      MaintenanceFilterOptions
}

const VALID_TABS = ['overview', 'mt', 'sd', 'bld', 'un', 'team', 'cost', 'tasks'] as const
type TabKey = (typeof VALID_TABS)[number]

function normalizeTab(raw: string | null | undefined): TabKey {
  if (typeof raw === 'string' && (VALID_TABS as readonly string[]).includes(raw)) return raw as TabKey
  return 'overview'
}

export function MaintenanceClient(props: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const activeTab = normalizeTab(searchParams.get('tab'))

  function setActiveTab(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `?${qs}` : '?', { scroll: false }))
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="!flex-col w-full">
        <TabsList variant="line" className="border-b border-[#E0DBD4] w-full justify-start h-12 pb-2 overflow-x-auto">
          <TabsTrigger value="overview" className="px-4 text-sm gap-2 shrink-0">
            <LayoutDashboard className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="mt" className="px-4 text-sm gap-2 shrink-0">
            <TrendingUp className="w-4 h-4" /> Monthly Trend
          </TabsTrigger>
          <TabsTrigger value="sd" className="px-4 text-sm gap-2 shrink-0">
            <Wrench className="w-4 h-4" /> Subdepartments
          </TabsTrigger>
          <TabsTrigger value="bld" className="px-4 text-sm gap-2 shrink-0">
            <Building2 className="w-4 h-4" /> Buildings
          </TabsTrigger>
          <TabsTrigger value="un" className="px-4 text-sm gap-2 shrink-0">
            <Home className="w-4 h-4" /> Units Detail
          </TabsTrigger>
          <TabsTrigger value="team" className="px-4 text-sm gap-2 shrink-0">
            <Users className="w-4 h-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="cost" className="px-4 text-sm gap-2 shrink-0">
            <DollarSign className="w-4 h-4" /> Owner Costs
          </TabsTrigger>
          <TabsTrigger value="tasks" className="px-4 text-sm gap-2 shrink-0">
            <ClipboardList className="w-4 h-4" /> Tasks Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab filters={props.overviewFilters} aggregate={props.overviewAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="mt" className="mt-4">
          <MonthlyTab filters={props.monthlyFilters} aggregate={props.monthlyAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="sd" className="mt-4">
          <SubdeptTab filters={props.subdeptFilters} aggregate={props.subdeptAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="bld" className="mt-4">
          <BuildingsTab filters={props.buildingsFilters} aggregate={props.buildingsAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="un" className="mt-4">
          <UnitsDetailTab filters={props.unitsFilters} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamTab filters={props.teamFilters} aggregate={props.teamAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <OwnerCostsTab filters={props.costFilters} aggregate={props.ownerCostsAggregate} filterOptions={props.filterOptions} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksTableTab filters={props.tasksFilters} list={props.tasksList} filterOptions={props.filterOptions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
