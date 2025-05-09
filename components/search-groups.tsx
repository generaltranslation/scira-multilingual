import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { searchGroups, type SearchGroup } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useGT } from "gt-next/client";

// Type for Group IDs, ensure this matches the IDs in searchGroups from @/lib/utils
export type SearchGroupId = 'web' | 'academic' | 'youtube' | 'reddit' | 'analysis' | 'chat' | 'extreme' | 'buddy';

interface TranslatedGroupInfo {
  name: string;
  description: string;
}

// This hook provides a dictionary of translated names and descriptions for all group IDs.
export function useTranslatedGroupInfo(): Record<SearchGroupId, TranslatedGroupInfo> {
  const t = useGT();
  
  // Returns a dictionary mapping each SearchGroupId to its translated name and description.
  const translations: Record<SearchGroupId, TranslatedGroupInfo> = {
    web: { name: t('Web'), description: t('Search across the entire internet') },
    buddy: { name: t('Buddy'), description: t('Your personal memory companion') },
    analysis: { name: t('Analysis'), description: t('Code, stock and currency stuff') },
    chat: { name: t('Chat'), description: t('Talk to the model directly.') },
    reddit: { name: t('Reddit'), description: t('Search Reddit posts') },
    academic: { name: t('Academic'), description: t('Search academic papers powered by Exa') },
    youtube: { name: t('YouTube'), description: t('Search YouTube videos powered by Exa') },
    extreme: { name: t('Extreme'), description: t('Deep research with multiple sources and analysis') },
  };
  return translations;
}

interface SearchGroupsProps {
  selectedGroup: string; // Assuming this is one of SearchGroupId
  onGroupSelect: (group: SearchGroup) => void; // SearchGroup.id should be compatible with SearchGroupId
}

export function SearchGroups({ selectedGroup, onGroupSelect }: SearchGroupsProps) {
  const translatedGroupInfo = useTranslatedGroupInfo();

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {searchGroups.map((group) => {
        const Icon = group.icon;
        const isSelected = selectedGroup === group.id;
        const groupInfo = translatedGroupInfo[group.id as SearchGroupId] || { name: group.name, description: 'Description not available' }; 

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
                    {groupInfo.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {groupInfo.description} 
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}