'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs, type Key } from 'react-aria-components';

/** Visual das abas do ArcanaKin (pílulas), o mesmo do perfil e da análise do deck. */
export const TAB_CLASS =
  'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold transition motion-reduce:transition-none hover:bg-surface-muted data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-on-primary';

export interface PillTab {
  id: string;
  title: string;
  /** Número ao lado do título (ex.: problemas na validação); o texto vai em `badgeLabel`. */
  badge?: number;
  badgeLabel?: string;
  content: ReactNode;
}

/**
 * Abas (padrão ARIA, pelo React Aria: setas trocam de aba, Tab entra no painel). Com `param`, a
 * aba escolhida fica no endereço (`?aba=mao`) para links e a ajuda apontarem direto para ela.
 */
export function PillTabs({
  label,
  tabs,
  defaultId,
  param,
  className = 'space-y-4',
}: {
  label: string;
  tabs: PillTab[];
  defaultId?: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const fromUrl = param ? search.get(param) : null;
  const ids = tabs.map((t) => t.id);
  const initial = fromUrl && ids.includes(fromUrl) ? fromUrl : (defaultId ?? ids[0]);
  const onChange = (key: Key) => {
    if (!param) return;
    const next = new URLSearchParams(search.toString());
    if (key === (defaultId ?? ids[0])) next.delete(param);
    else next.set(param, String(key));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  return (
    <Tabs defaultSelectedKey={initial} onSelectionChange={onChange} className={className}>
      <TabList aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Tab key={tab.id} id={tab.id} className={TAB_CLASS}>
            {tab.title}
            {tab.badge ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-on-accent"
                >
                  {tab.badge}
                </span>
                <span className="sr-only">{tab.badgeLabel}</span>
              </>
            ) : null}
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
