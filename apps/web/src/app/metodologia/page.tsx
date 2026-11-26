import type { Metadata } from 'next';
import { ROLE_POINTS } from '@boramarcar/core';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { HistoryBackLink } from '@/components/history-back-link';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { getSessionUser } from '@/server/session';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('methodology');
  return pageMetadata({
    section: 'learn',
    path: '/metodologia',
    title: t('metaTitle'),
    description: t('metaDescription'),
    index: true,
  });
}

const SOURCES = [
  ['scryfall', 'https://scryfall.com'],
  ['spellbook', 'https://commanderspellbook.com'],
  ['bcb', 'https://www.bcb.gov.br'],
  ['importers', null],
  ['links', null],
  ['group', null],
] as const;
const STEPS = [
  'format',
  'roles',
  'score',
  'suggestions',
  'bracket',
  'mana',
  'compare',
  'group',
] as const;
/**
 * Partes da nota e a cor de cada uma. Seis cores distintas das três famílias da marca (roxo,
 * mana, dourado), alternando a família a cada parte; validadas para daltonismo (ΔE ≥ 12 entre
 * vizinhas). A lista ao lado traz os pontos e o nome, então a cor nunca é a única pista.
 */
const SCORE_PARTS = [
  ['lands', 25, 'bg-brand-800 dark:bg-brand-600'],
  ['ramp', ROLE_POINTS.ramp, 'bg-teal-500'],
  ['draw', ROLE_POINTS.draw, 'bg-gold-600'],
  ['removal', ROLE_POINTS.removal, 'bg-brand-400'],
  ['wipe', ROLE_POINTS.wipe, 'bg-teal-600'],
  ['curve', 10, 'bg-gold-500'],
] as const;

/**
 * Metodologia (pública): de onde vêm os dados e como a análise de deck funciona. Saiu da página
 * inicial (revisão de design, 26/11/2026), que ficou com o produto e um FAQ curto.
 */
export default async function MethodologyPage() {
  const t = await getTranslations('methodology');
  const tc = await getTranslations('common');
  const signedIn = Boolean(await getSessionUser(await headers()).catch(() => null));

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-4xl space-y-14 px-4 py-10 focus:outline-none sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="rounded-lg py-1">
          <Logo title={tc('appName')} className="h-6 w-auto text-arcano dark:text-pergaminho" />
        </Link>
        <HistoryBackLink
          fallback={signedIn ? '/painel' : '/'}
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tc('back')}
        </HistoryBackLink>
      </div>

      <header className="max-w-2xl space-y-3">
        <h1 className="page-title sm:text-4xl">{t('title')}</h1>
        <p className="muted text-lg">{t('intro')}</p>
      </header>

      <section aria-labelledby="sources" className="scroll-mt-20">
        <h2 id="sources" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('sources.title')}
        </h2>
        <p className="muted mt-2 mb-8 max-w-2xl">{t('sources.subtitle')}</p>
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {SOURCES.map(([key, url]) => (
            <div key={key} className="border-s-2 border-line-strong ps-5">
              <dt className="font-semibold">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {t(`sources.items.${key}.name`)}
                    <span className="sr-only"> {tc('newTab')}</span>
                  </a>
                ) : (
                  t(`sources.items.${key}.name`)
                )}
              </dt>
              <dd className="muted mt-1">{t(`sources.items.${key}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="method" className="scroll-mt-20">
        <h2 id="method" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('method.title')}
        </h2>
        <p className="muted mt-2 mb-8 max-w-2xl">{t('method.subtitle')}</p>
        <figure className="card mb-8">
          <figcaption className="mb-3 font-semibold">{t('method.scoreCaption')}</figcaption>
          {/* Barra decorativa: os mesmos números estão na lista abaixo. */}
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {SCORE_PARTS.map(([key, points, color]) => (
              <span
                key={key}
                className={`h-full ${color}`}
                style={{ flexGrow: points, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {SCORE_PARTS.map(([key, points, color]) => (
              <li key={key} className="flex items-center gap-2">
                <span className={`size-3 shrink-0 rounded-sm ${color}`} aria-hidden="true" />
                <span className="font-semibold tabular-nums">
                  {t('method.points', { count: points })}
                </span>
                <span className="muted">· {t(`method.parts.${key}`)}</span>
              </li>
            ))}
          </ul>
        </figure>
        <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {STEPS.map((key) => (
            <li key={key}>
              <h3 className="mb-1 font-semibold">{t(`method.steps.${key}.title`)}</h3>
              <p className="muted">{t(`method.steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
