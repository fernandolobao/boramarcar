'use client';

import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';

/**
 * Abas das conquistas no perfil: "Para conquistar" abre por padrão; "Conquistadas" ao lado.
 * As listas chegam prontas do servidor (o conteúdo de cada aba).
 */
export function AchievementTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { id: 'pending' | 'done'; title: string; content: ReactNode }[];
}) {
  return (
    <Tabs defaultSelectedKey="pending" className="mt-4 space-y-4">
      <TabList aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold transition motion-reduce:transition-none hover:bg-surface-muted data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-on-primary"
          >
            {tab.title}
          </Tab>
        ))}
      </TabList>
      {tabs.map((tab) => (
        <TabPanel
          key={tab.id}
          id={tab.id}
          className="rounded-xl data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-4 data-[focus-visible]:outline-focus"
        >
          {tab.content}
        </TabPanel>
      ))}
    </Tabs>
  );
}
