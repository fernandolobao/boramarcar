import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GlossarySearch } from '@/components/glossary';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { pageMetadata } from '@/server/seo';
import { learnContext } from '../content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('learn.glossary');
  return pageMetadata({
    section: 'learn',
    path: '/aprender/glossario',
    title: t('title'),
    description: t('intro'),
    index: true,
  });
}

/** Glossário de palavras-chave e termos do jogo (12.3), aberto sem conta. */
export default async function GlossaryPage() {
  const { links, content } = await learnContext();
  const t = await getTranslations('learn.glossary');
  const tl = await getTranslations('learn');
  const tc = await getTranslations('common');
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-3xl space-y-8 px-4 py-10 focus:outline-none sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="rounded-lg py-1">
          <Logo title={tc('appName')} className="h-6 w-auto text-arcano dark:text-pergaminho" />
        </Link>
        <Link
          href="/aprender"
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tl('allLessons')}
        </Link>
      </div>
      <header className="space-y-2">
        <h1 className="page-title">{t('title')}</h1>
        <p>{t('intro')}</p>
        <p className="text-sm">
          <a
            href={links.glossary}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-link underline underline-offset-2"
          >
            {content.official.glossary}
            <Icon name="externalLink" className="size-4" />
            <span className="sr-only">{tc('newTab')}</span>
          </a>
        </p>
      </header>
      <GlossarySearch />
    </main>
  );
}
