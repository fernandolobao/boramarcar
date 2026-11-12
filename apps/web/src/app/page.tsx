import type { Metadata } from 'next';
import { GAME_FORMATS, ROLE_POINTS, TAGGER_ROLES } from '@boramarcar/core';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { HeroVideo } from '@/components/home/hero-video';
import { Icon, type IconName } from '@/components/icons';
import { Logo } from '@/components/logo';
import { getSessionUser } from '@/server/session';
import { CONTACT_EMAIL } from '@/lib/contact';

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
/**
 * Cores da paleta ArcanaKin (tokens), só como detalhe visual (o texto carrega a informação).
 * Todas com ícone branco ≥ 3:1 por cima.
 */
const ACCENTS = [
  'var(--color-eter)',
  'var(--color-teal-700)',
  'var(--color-gold-700)',
  'var(--color-arcano)',
  'var(--color-brand-700)',
  'var(--color-teal-800)',
];

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
      <p className="font-mono text-sm font-semibold text-link" aria-hidden="true">
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
 * Página inicial (pública, igual para quem entrou ou não): apresenta o ArcanaKin, as
 * funcionalidades, as fontes de dados, a metodologia da análise, os valores e o convite aos testes.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser(await headers()).catch(() => null);
  const accountDeleted = (await searchParams).conta === 'excluida';
  const tp = await getTranslations('privacySettings');
  const tl = await getTranslations('legal');
  const t = await getTranslations('home');
  const tc = await getTranslations('common');
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('join.emailSubject'))}`;
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
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-lg py-1">
            <Logo title={tc('appName')} className="h-6 w-auto text-arcano dark:text-pergaminho" />
          </Link>
          <nav aria-label={t('nav.label')} className="hidden lg:block">
            <ul className="flex gap-1 text-sm">
              {sections.map((s) => (
                <li key={s}>
                  <a href={`#${s}`} className="rounded-lg px-3 py-2 hover:bg-surface-muted">
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
        {accountDeleted && !user && (
          <p role="status" className="bg-surface-muted px-4 py-3 text-center text-sm font-medium">
            {tp('accountDeleted')}
          </p>
        )}
        {/* Hero com vídeo abstrato; o texto fica sobre uma camada escura (contraste AA). */}
        <section
          aria-labelledby="home-title"
          className="relative isolate flex min-h-[72svh] items-center overflow-hidden bg-noite text-pergaminho"
        >
          <HeroVideo />
          <div
            className="absolute inset-0 bg-gradient-to-r from-noite/90 via-noite/55 to-noite/10"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-noite/80 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            {/* O nome em texto está no título da página e no cabeçalho; aqui o logotipo é a marca. */}
            <Logo className="mb-8 h-10 w-auto text-pergaminho sm:h-14" />
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/25 backdrop-blur">
              <span className="size-2 rounded-full bg-mana" aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>
            <h1
              id="home-title"
              className="max-w-4xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl"
            >
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-200 sm:text-xl">{t('hero.subtitle')}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              {dashboardButton('lg')}
              <a
                href="#join"
                className="btn inline-flex bg-accent px-6 text-base text-on-accent hover:bg-gold-300"
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
              <p className="muted text-lg">{t('intro.name')}</p>
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
          className="scroll-mt-20 border-y border-line bg-surface py-20"
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
                <li key={key} className="rounded-2xl border border-line bg-canvas p-6">
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
                <div key={key} className="border-s-4 border-accent ps-5">
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
          className="scroll-mt-20 border-y border-line bg-surface py-20"
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
                <li key={key} className="rounded-2xl border border-line p-6">
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
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
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
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-noite px-6 py-16 text-pergaminho sm:px-12">
            <div
              className="absolute -inset-20 -z-10 opacity-90 blur-3xl"
              style={{
                background:
                  'radial-gradient(closest-side at 15% 20%, var(--color-eter), transparent), radial-gradient(closest-side at 85% 90%, var(--color-teal-800), transparent), radial-gradient(closest-side at 90% 10%, var(--color-arcano), transparent), radial-gradient(closest-side at 50% 110%, var(--color-gold-800), transparent)',
              }}
              aria-hidden="true"
            />
            <p className="font-mono text-sm font-semibold text-gold-300" aria-hidden="true">
              05
            </p>
            <h2 id="join" className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
              {t('join.title')}
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-ink-200">{t('join.body')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={mailto}
                className="btn inline-flex bg-accent px-6 text-base text-on-accent hover:bg-gold-300"
              >
                <Icon name="email" />
                {t('join.email')}
              </a>
              <span className="text-ink-200">{t('join.or')}</span>
              {dashboardButton('lg')}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10 text-sm">
        <div className="mx-auto max-w-6xl space-y-2 px-4 sm:px-6">
          <Logo title={tc('appName')} className="h-5 w-auto text-arcano dark:text-pergaminho" />
          <p className="muted">{t('footer.credits')}</p>
          <p className="muted">{t('footer.disclaimer')}</p>
          <p>
            {t('footer.contact')}:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <Link href="/privacidade" className="underline underline-offset-2">
              {tl('privacy')}
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
