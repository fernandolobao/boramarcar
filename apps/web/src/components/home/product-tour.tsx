'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';

/** Telas capturadas por `pnpm --filter @boramarcar/web showcase` (grupo fictício). */
const SCREENS = [
  { key: 'painel', height: 800 },
  { key: 'disponibilidade', height: 800 },
  { key: 'deck', height: 800 },
  { key: 'colecao', height: 800 },
  { key: 'mesa', height: 889 },
  { key: 'ranking', height: 800 },
  { key: 'torneio', height: 800 },
  { key: 'lojas', height: 800 },
  { key: 'loja', height: 800 },
] as const;

/**
 * "Veja por dentro": abas (setas, Home/End) com capturas reais do produto. Cada tela tem a versão
 * clara e a escura; só a do tema ativo aparece (a outra fica com `display: none`).
 */
export function ProductTour() {
  const t = useTranslations('home.tour');
  return (
    <Tabs className="space-y-6">
      <TabList
        aria-label={t('tabsLabel')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {SCREENS.map(({ key }) => (
          <Tab
            key={key}
            id={key}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold whitespace-nowrap transition motion-reduce:transition-none hover:bg-surface-muted data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-on-primary"
          >
            {t(`items.${key}.tab`)}
          </Tab>
        ))}
      </TabList>
      {SCREENS.map(({ key, height }) => (
        <TabPanel
          key={key}
          id={key}
          className="rounded-2xl data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-4 data-[focus-visible]:outline-focus"
        >
          <figure className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-lg">
              <Image
                src={`/showcase/${key}-light.webp`}
                alt={t(`items.${key}.alt`)}
                width={1280}
                height={height}
                sizes="(min-width: 1152px) 1104px, 100vw"
                className="h-auto w-full dark:hidden"
              />
              <Image
                src={`/showcase/${key}-dark.webp`}
                alt={t(`items.${key}.alt`)}
                width={1280}
                height={height}
                sizes="(min-width: 1152px) 1104px, 100vw"
                className="hidden h-auto w-full dark:block"
              />
            </div>
            <figcaption className="muted text-center text-lg">
              {t(`items.${key}.caption`)}
            </figcaption>
          </figure>
        </TabPanel>
      ))}
    </Tabs>
  );
}
