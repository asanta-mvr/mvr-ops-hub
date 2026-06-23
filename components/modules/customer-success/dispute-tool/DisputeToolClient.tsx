'use client'

import { useState } from 'react'
import { Bot, BookOpen, ClipboardList, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  AgentConfigRecord,
  AgentVersionRecord,
  CaseListItem,
  KnowledgeRecord,
  SkillRecord,
} from '@/lib/disputes/types'
import { AnalyzeTab } from './AnalyzeTab'
import { TrackerTab } from './TrackerTab'
import { KnowledgeTab } from './KnowledgeTab'
import { AgentTab } from './AgentTab'

interface Props {
  initialCases: CaseListItem[]
  initialKnowledge: KnowledgeRecord[]
  initialAgentConfig: AgentConfigRecord
  initialAgentVersions: AgentVersionRecord[]
  initialSkills: SkillRecord[]
}

export function DisputeToolClient({
  initialCases,
  initialKnowledge,
  initialAgentConfig,
  initialAgentVersions,
  initialSkills,
}: Props) {
  const [activeTab, setActiveTab] = useState('analyze')

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="!flex-col w-full">
        <TabsList variant="line" className="border-b border-[#E0DBD4] w-full justify-start h-12 pb-2">
          <TabsTrigger value="analyze" className="px-4 text-sm gap-2">
            <Sparkles className="w-4 h-4" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="tracker" className="px-4 text-sm gap-2">
            <ClipboardList className="w-4 h-4" />
            Tracker
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="px-4 text-sm gap-2">
            <BookOpen className="w-4 h-4" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="agent" className="px-4 text-sm gap-2">
            <Bot className="w-4 h-4" />
            Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <AnalyzeTab />
        </TabsContent>

        <TabsContent value="tracker" className="space-y-4">
          <TrackerTab initialCases={initialCases} />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeTab initialKnowledge={initialKnowledge} />
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          <AgentTab
            initialConfig={initialAgentConfig}
            initialVersions={initialAgentVersions}
            initialSkills={initialSkills}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
