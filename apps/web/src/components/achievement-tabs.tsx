'use client';

import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { TAB_CLASS } from './ds/tabs';

/**
 * Abas das conquistas no perfil: "Em aberto" abre por padrão; "Finalizadas" ao lado.
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
          <Tab key={tab.id} id={tab.id} className={TAB_CLASS}>
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
