import type { Metadata } from 'next';
import { GAME_FORMATS, ROLE_POINTS, TAGGER_ROLES } from '@boramarcar/core';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { HeroVideo } from '@/components/home/hero-video';
import { Icon, type IconName } from '@/components/icons';
import { getSessionUser } from '@/server/session';

const CONTACT = 'fernando@fernandocamilotti.com';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');
  return { title: { absolute: t('metaTitle') }, description: t('metaDescription') };
}

const FEATURES = [
  ['availability', 'availability'],
  ['events', 'events'],
  ['games', 'games'],
  ['ranking', 'ranking'],
  ['profiles', 'achievement'],
  ['decks', 'decks'],
  ['proxies', 'print'],
  ['analysis', 'bracket'],
  ['mobile', 'mobile'],
] as const satisfies readonly (readonly [string, IconName])[];
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
const SCORE_PARTS = [
  ['lands', 25],
  ['ramp', ROLE_POINTS.ramp],
  ['draw', ROLE_POINTS.draw],
  ['removal', ROLE_POINTS.removal],
  ['wipe', ROLE_POINTS.wipe],
  ['curve', 10],
] as const;
/** Cores das 5 manas + roxo da marca, só como detalhe visual (o texto carrega a informação). */
const ACCENTS = ['#d6b85a', '#2f7fd8', '#8b5cf6', '#e0413a', '#1fa363', '#7c3aed'];

function SectionHeading({
  id,
  index,
  title,
  subtitle,
}: {
  id: string;
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl space-y-3">
      <p
        className="font-mono text-sm font-semibold text-brand-700 dark:text-brand-400"
        aria-hidden="true"
      >
        {index}
      </p>
      <h2 id={id} className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="muted text-lg">{subtitle}</p>}
    </div>
  );
}

/**
 * Página inicial (pública, igual para quem entrou ou não): apresenta o Bora Marcar, as
 * funcionalidades, as fontes de dados, a metodologia da análise, os valores e o convite aos testes.
 */
export default async function HomePage() {
  const user = await getSessionUser(await headers()).catch(() => null);
  const t = await getTranslations('home');
  const tc = await getTranslations('common');
  const mailto = `mailto:${CONTACT}?subject=${encodeURIComponent(t('join.emailSubject'))}`;
  const sections = ['features', 'sources', 'method', 'values', 'join'] as const;

  const dashboardButton = (size: 'sm' | 'lg') =>
    user ? (
      <Link href="/painel" className={`btn-primary ${size === 'lg' ? 'px-6 text-base' : ''}`}>
        <Icon name="dashboard" />
        {t('goToDashboard')}
      </Link>
    ) : (
      <SignInButton
        label={size === 'lg' ? undefined : t('signInToDashboard')}
        compact={size === 'sm'}
      />
    );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            {tc('appName')}
          </Link>
          <nav aria-label={t('nav.label')} className="hidden lg:block">
            <ul className="flex gap-1 text-sm">
              {sections.map((s) => (
                <li key={s}>
                  <a
                    href={`#${s}`}
                    className="rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {t(`nav.${s}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {dashboardButton('sm')}
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {/* Hero com vídeo abstrato; o texto fica sobre uma camada escura (contraste AA). */}
        <section
          aria-labelledby="home-title"
          className="relative isolate flex min-h-[72svh] items-center overflow-hidden bg-zinc-950 text-white"
        >
          <HeroVideo />
          <div
            className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/10"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950/80 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/25 backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>
            <h1
              id="home-title"
              className="max-w-4xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl"
            >
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-zinc-200 sm:text-xl">{t('hero.subtitle')}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              {dashboardButton('lg')}
              <a
                href="#join"
                className="btn inline-flex border border-white/40 bg-white/10 px-6 text-base text-white backdrop-blur hover:bg-white/20"
              >
                <Icon name="email" />
                {t('hero.join')}
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="intro" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
            <div className="space-y-4">
              <h2 id="intro" className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('intro.title')}
              </h2>
              <p className="muted text-lg">{t('intro.body')}</p>
            </div>
            <dl className="grid grid-cols-3 gap-4">
              {(
                [
                  ['formats', GAME_FORMATS.length - 1],
                  ['roles', TAGGER_ROLES.length],
                  ['languages', 2],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="card flex flex-col-reverse justify-end text-center">
                  <dt className="muted text-sm">{t(`intro.stats.${key}`)}</dt>
                  <dd className="text-4xl font-extrabold text-brand-700 dark:text-brand-400">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="features"
          className="scroll-mt-20 border-y border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="features"
              index="01"
              title={t('features.title')}
              subtitle={t('features.subtitle')}
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([key, icon], i) => (
                <li
                  key={key}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span
                    className="mb-4 inline-flex size-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: ACCENTS[i % ACCENTS.length] }}
                    aria-hidden="true"
                  >
                    <Icon name={icon} className="size-5" />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{t(`features.items.${key}.title`)}</h3>
                  <p className="muted">{t(`features.items.${key}.body`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="sources" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="sources"
              index="02"
              title={t('sources.title')}
              subtitle={t('sources.subtitle')}
            />
            <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {SOURCES.map(([key, url]) => (
                <div key={key} className="border-s-4 border-brand-500 ps-5">
                  <dt className="text-lg font-semibold">
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
          </div>
        </section>

        <section
          aria-labelledby="method"
          className="scroll-mt-20 border-y border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="method"
              index="03"
              title={t('method.title')}
              subtitle={t('method.subtitle')}
            />
            <figure className="mb-12">
              <figcaption className="mb-3 font-semibold">{t('method.scoreCaption')}</figcaption>
              {/* Barra decorativa: os mesmos números estão na lista ao lado. */}
              <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {SCORE_PARTS.map(([key, points], i) => (
                  <span
                    key={key}
                    className="h-full"
                    style={{ flexGrow: points, flexBasis: 0, backgroundColor: ACCENTS[i] }}
                  />
                ))}
              </div>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {SCORE_PARTS.map(([key, points], i) => (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: ACCENTS[i] }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold tabular-nums">
                      {t('method.points', { count: points })}
                    </span>
                    <span className="muted">· {t(`method.parts.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </figure>
            <ol className="grid gap-6 md:grid-cols-2">
              {STEPS.map((key) => (
                <li
                  key={key}
                  className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
                >
                  <h3 className="mb-2 text-lg font-semibold">{t(`method.steps.${key}.title`)}</h3>
                  <p className="muted">{t(`method.steps.${key}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="values" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="values" index="04" title={t('values.title')} />
            <ul className="grid gap-6 md:grid-cols-2">
              {(['accessible', 'privacy'] as const).map((key) => (
                <li key={key} className="card flex gap-4 p-6">
                  <span
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-400"
                    aria-hidden="true"
                  >
                    <Icon name={key} className="size-6" />
                  </span>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold">{t(`values.items.${key}.title`)}</h3>
                    <p className="muted">{t(`values.items.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="join" className="scroll-mt-20 px-4 pb-20 sm:px-6">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 px-6 py-16 text-white sm:px-12">
            <div
              className="absolute -inset-20 -z-10 opacity-90 blur-3xl"
              style={{
                background:
                  'radial-gradient(closest-side at 15% 20%, #7c3aed, transparent), radial-gradient(closest-side at 85% 90%, #1fa363, transparent), radial-gradient(closest-side at 90% 10%, #2f7fd8, transparent), radial-gradient(closest-side at 50% 110%, #e0413a, transparent)',
              }}
              aria-hidden="true"
            />
            <p className="font-mono text-sm font-semibold text-violet-200" aria-hidden="true">
              05
            </p>
            <h2 id="join" className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
              {t('join.title')}
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-zinc-200">{t('join.body')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={mailto}
                className="btn inline-flex bg-white px-6 text-base text-zinc-950 hover:bg-zinc-200"
              >
                <Icon name="email" />
                {t('join.email')}
              </a>
              <span className="text-zinc-200">{t('join.or')}</span>
              {dashboardButton('lg')}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-10 text-sm dark:border-zinc-800">
        <div className="mx-auto max-w-6xl space-y-2 px-4 sm:px-6">
          <p className="font-semibold">{tc('appName')}</p>
          <p className="muted">{t('footer.credits')}</p>
          <p className="muted">{t('footer.disclaimer')}</p>
          <p>
            {t('footer.contact')}:{' '}
            <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">
              {CONTACT}
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
