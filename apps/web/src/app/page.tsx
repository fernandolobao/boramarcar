import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { ProductTour } from '@/components/home/product-tour';
import { Screenshot } from '@/components/home/screenshot';
import { Icon, type IconName } from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { getSessionUser } from '@/server/session';
import { CONTACT_EMAIL } from '@/lib/contact';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');
  return pageMetadata({
    section: 'home',
    path: '/',
    title: t('metaTitle'),
    description: t('metaDescription'),
    index: true,
  });
}

/**
 * Três recursos, cada um com uma tela real do app (capturas de "Veja por dentro") e os itens que
 * ele cobre. Layouts diferentes: texto e tela lado a lado, invertido, e tela larga embaixo.
 */
const SPOTLIGHTS = [
  {
    key: 'agenda',
    shot: 'disponibilidade',
    points: [
      ['availability', 'availability'],
      ['events', 'events'],
      ['games', 'games'],
    ],
  },
  {
    key: 'decks',
    shot: 'deck',
    points: [
      ['decks', 'decks'],
      ['analysis', 'bracket'],
      ['proxies', 'print'],
    ],
  },
  {
    key: 'group',
    shot: 'ranking',
    points: [
      ['ranking', 'ranking'],
      ['profiles', 'achievement'],
    ],
  },
] as const satisfies readonly {
  key: string;
  shot: string;
  points: readonly (readonly [string, IconName])[];
}[];
const FAQ = ['free', 'account', 'formats', 'mobile', 'data', 'wizards'] as const;

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-12 max-w-2xl space-y-3">
      <h2
        id={id}
        className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle && <p className="muted text-lg">{subtitle}</p>}
    </div>
  );
}

/**
 * Página inicial (pública, igual para quem entrou ou não), refeita na revisão de design
 * (26/11/2026): o produto grande no topo, três recursos com telas reais, "Veja por dentro", os
 * valores, um FAQ curto e o convite aos testes. Fontes e metodologia ficam em `/metodologia`.
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
  const sections = ['features', 'tour', 'faq'] as const;

  const dashboardButton = (size: 'sm' | 'lg') =>
    user ? (
      <Link href="/painel" className={`btn-primary ${size === 'lg' ? 'px-6 text-base' : ''}`}>
        <Icon name="dashboard" />
        {size === 'sm' ? (
          <>
            <span className="min-[400px]:hidden">{t('dashboardShort')}</span>
            <span className="hidden min-[400px]:inline">{t('goToDashboard')}</span>
          </>
        ) : (
          t('goToDashboard')
        )}
      </Link>
    ) : size === 'sm' ? (
      // Cabeçalho: a tela de entrada oferece Google ou e-mail e senha.
      <Link href="/entrar" className="btn-primary">
        <Icon name="signIn" />
        {/* Em telas bem estreitas (320 px) o texto curto cabe ao lado do seletor de idioma. */}
        <span className="min-[400px]:hidden">{t('signInShort')}</span>
        <span className="hidden min-[400px]:inline">{t('signInToDashboard')}</span>
      </Link>
    ) : (
      <>
        <SignInButton />
        <Link href="/cadastro" className="btn-secondary px-6 text-base">
          <Icon name="email" />
          {t('signUpEmail')}
        </Link>
      </>
    );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 min-[400px]:gap-4 sm:px-6">
          <Link href="/" className="shrink-0 rounded-lg py-1">
            <Logo
              title={tc('appName')}
              className="h-5 w-auto text-arcano min-[400px]:h-6 dark:text-pergaminho"
            />
          </Link>
          <nav aria-label={t('nav.label')} className="hidden lg:block">
            <ul className="flex gap-1 text-sm">
              {sections.map((s) => (
                <li key={s}>
                  <a
                    href={`#${s}`}
                    className="rounded-lg px-3 py-2 whitespace-nowrap hover:bg-surface-muted"
                  >
                    {t(`nav.${s}`)}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/metodologia"
                  className="rounded-lg px-3 py-2 whitespace-nowrap hover:bg-surface-muted"
                >
                  {t('nav.methodology')}
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3">
            <LanguageSwitcher />
            {dashboardButton('sm')}
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {accountDeleted && !user && (
          <p role="status" className="bg-surface-muted px-4 py-3 text-center text-sm font-medium">
            {tp('accountDeleted')}
          </p>
        )}
        {/* Topo: a promessa e, logo abaixo, o produto grande (o painel de verdade). */}
        <section aria-labelledby="home-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_85%_0%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent),radial-gradient(50%_40%_at_0%_40%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent)]"
          />
          <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
            <div className="max-w-3xl motion-safe:animate-[enter_450ms_ease-out_both]">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent">
                {t('hero.eyebrow')}
              </p>
              <h1
                id="home-title"
                className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
              >
                {/* Uma frase por linha ("A mesa fecha." / "O ArcanaKin cuida do resto."). */}
                {t('hero.title')
                  .split(/(?<=\.)\s+/)
                  .map((sentence) => (
                    <span key={sentence} className="block">
                      {sentence}
                    </span>
                  ))}
              </h1>
              <p className="muted mt-6 max-w-2xl text-lg sm:text-xl">{t('hero.subtitle')}</p>
              <div className="mt-10 flex flex-wrap gap-3">{dashboardButton('lg')}</div>
            </div>
            <div className="mt-14 motion-safe:animate-[enter_900ms_ease-out_150ms_both] sm:mt-20">
              <Screenshot
                name="painel"
                alt={t('tour.items.painel.alt')}
                url="arcanakin.com.br/painel"
                sizes="(min-width: 1152px) 1104px, 100vw"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="features"
              title={t('features.title')}
              subtitle={t('features.subtitle')}
            />
            <div className="space-y-24 sm:space-y-32">
              {SPOTLIGHTS.map(({ key, shot, points }, i) => {
                const wide = i === SPOTLIGHTS.length - 1;
                const text = (
                  <div className={wide ? 'grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end' : ''}>
                    <div>
                      <p className="text-sm font-semibold tracking-wide text-link uppercase">
                        {t(`features.spotlights.${key}.eyebrow`)}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                        {t(`features.spotlights.${key}.title`)}
                      </h3>
                      <p className="muted mt-4 text-lg">{t(`features.spotlights.${key}.body`)}</p>
                    </div>
                    <ul className={`space-y-5 ${wide ? '' : 'mt-8'}`}>
                      {points.map(([point, icon]) => (
                        <li key={point} className="flex gap-4">
                          <span
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-link"
                            aria-hidden="true"
                          >
                            <Icon name={icon} className="size-5" />
                          </span>
                          <div>
                            <h4 className="font-semibold">{t(`features.items.${point}.title`)}</h4>
                            <p className="muted mt-0.5">{t(`features.items.${point}.body`)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
                const image = (
                  <Screenshot
                    name={shot}
                    alt={t(`tour.items.${shot}.alt`)}
                    sizes={
                      wide
                        ? '(min-width: 1152px) 1104px, 100vw'
                        : '(min-width: 1024px) 560px, 100vw'
                    }
                  />
                );
                return wide ? (
                  <article key={key} className="space-y-12">
                    {text}
                    {image}
                  </article>
                ) : (
                  <article key={key} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    {text}
                    <div className={i % 2 === 1 ? 'lg:order-first' : ''}>{image}</div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="tour"
          className="scroll-mt-20 border-y border-line bg-surface py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="tour" title={t('tour.title')} subtitle={t('tour.subtitle')} />
            <ProductTour />
          </div>
        </section>

        <section aria-labelledby="values" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="values" className="text-sm font-semibold tracking-wide text-link uppercase">
              {t('values.title')}
            </h2>
            <p className="mt-6 max-w-4xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t('values.items.fun.title')}.
            </p>
            <p className="muted mt-6 max-w-3xl text-lg sm:text-xl">{t('values.items.fun.body')}</p>
            <ul className="mt-16 grid gap-10 md:grid-cols-3">
              {(['learn', 'transparency', 'accessible'] as const).map((key) => (
                <li key={key} className="border-t border-line-strong pt-6">
                  <Icon name={key} className="size-6 text-link" />
                  <h3 className="mt-4 text-lg font-semibold">{t(`values.items.${key}.title`)}</h3>
                  <p className="muted mt-2">{t(`values.items.${key}.body`)}</p>
                  {key === 'transparency' && (
                    <Link
                      href="/metodologia"
                      className="mt-3 inline-flex items-center gap-1 font-medium text-link underline underline-offset-4"
                    >
                      {t('values.items.transparency.link')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="faq"
          className="scroll-mt-20 border-t border-line bg-surface py-24 sm:py-32"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div className="space-y-4">
              <h2
                id="faq"
                className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
              >
                {t('faq.title')}
              </h2>
              <Link
                href="/metodologia"
                className="inline-flex items-center gap-1 font-medium text-link underline underline-offset-4"
              >
                {t('faq.methodLink')}
              </Link>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((key) => (
                <details key={key} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
                    {t(`faq.items.${key}.q`)}
                    <Icon
                      name="add"
                      className="size-5 shrink-0 text-fg-muted transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="muted mt-3 max-w-2xl">{t(`faq.items.${key}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="join" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              id="join"
              className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
            >
              {t('join.title')}
            </h2>
            <p className="muted mx-auto mt-6 max-w-2xl text-lg sm:text-xl">{t('join.body')}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {dashboardButton('lg')}
              <a href={mailto} className="btn-secondary px-6 text-base">
                <Icon name="email" />
                {t('join.email')}
              </a>
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
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/lojas" className="underline underline-offset-2">
              {tl('stores')}
            </Link>
            <Link href="/aprender" className="underline underline-offset-2">
              {tl('learn')}
            </Link>
            <Link href="/metodologia" className="underline underline-offset-2">
              {tl('methodology')}
            </Link>
            <Link href="/ajuda" className="underline underline-offset-2">
              {tl('help')}
            </Link>
            <Link href="/privacidade" className="underline underline-offset-2">
              {tl('privacy')}
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
