import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { searchGroups, type SearchGroup } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useGT } from "gt-next/client";

interface SearchGroupsProps {
  selectedGroup: string
  onGroupSelect: (group: SearchGroup) => void
}

type SearchGroupId = 'web' | 'academic' | 'youtube' | 'reddit' | 'analysis' | 'chat' | 'extreme' | 'buddy';

function TranslatedGroupDescription({ groupId }: { groupId: SearchGroupId }) {
  const t = useGT();
  
  // We use a switch statement to provide static strings for translation
  // This allows GT to extract these strings at build time
  switch (groupId) {
    case 'web':
      return t('Search across the entire internet');
    case 'buddy':
      return t('Your personal memory companion');
    case 'analysis':
      return t('Code, stock and currency stuff');
    case 'chat':
      return t('Talk to the model directly.');
    case 'reddit':
      return t('Search Reddit posts');
    case 'academic':
      return t('Search academic papers powered by Exa');
    case 'youtube':
      return t('Search YouTube videos powered by Exa');
    case 'extreme':
      return t('Deep research with multiple sources and analysis');
    default:
      return '';
  }
}

// Similarly for group names
function TranslatedGroupName({ groupId }: { groupId: SearchGroupId }) {
  const t = useGT();
  
  switch (groupId) {
    case 'web':
      return t('Web');
    case 'buddy':
      return t('Buddy');
    case 'analysis':
      return t('Analysis');
    case 'chat':
      return t('Chat');
    case 'reddit':
      return t('Reddit');
    case 'academic':
      return t('Academic');
    case 'youtube':
      return t('YouTube');
    case 'extreme':
      return t('Extreme');
    default:
      return '';
  }
}

export function SearchGroups({ selectedGroup, onGroupSelect }: SearchGroupsProps) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {searchGroups.map((group) => {
        const Icon = group.icon
        const isSelected = selectedGroup === group.id
        
        return (
          <Card
            key={group.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
              "border border-neutral-200 dark:border-neutral-800",
              isSelected && "ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-950"
            )}
            onClick={() => onGroupSelect(group)}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-neutral-100 dark:bg-neutral-800"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    <TranslatedGroupName groupId={group.id} />
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <TranslatedGroupDescription groupId={group.id} />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}