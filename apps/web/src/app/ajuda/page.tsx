import type { Metadata } from 'next';
import { HELP } from '@boramarcar/core/help';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { HistoryBackLink } from '@/components/history-back-link';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { getSessionUser } from '@/server/session';
import { pageMetadata } from '@/server/seo';

async function content() {
  const locale = await getLocale();
  return HELP[locale === 'en' ? 'en' : 'pt-BR'];
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    section: 'help',
    path: '/ajuda',
    title: (await content()).title,
    index: true,
  });
}

/**
 * Ajuda (FAQ): pública, sem login, nos dois idiomas. Texto fixo do core (o app mostra o mesmo).
 * Cada pergunta é um `<details>` nativo (abre/fecha pelo teclado e anuncia o estado) com âncora.
 */
export default async function HelpPage() {
  const h = await content();
  const tc = await getTranslations('common');
  const tl = await getTranslations('legal');
  const signedIn = Boolean(await getSessionUser(await headers()).catch(() => null));

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
        <HistoryBackLink
          fallback={signedIn ? '/painel' : '/'}
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tc('back')}
        </HistoryBackLink>
      </div>
      <header className="space-y-2">
        <h1 className="page-title">{h.title}</h1>
        <p>{h.intro}</p>
      </header>
      <nav aria-labelledby="indice" className="card">
        <h2 id="indice" className="sr-only">
          {h.title}
        </h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {h.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-link underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {h.sections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-t`}
          className="scroll-mt-6 space-y-3"
        >
          <h2 id={`${s.id}-t`} className="section-title mb-0">
            {s.title}
          </h2>
          {s.questions.map((q) => (
            <details
              key={q.id}
              id={`${s.id}-${q.id}`}
              className="group card scroll-mt-6 p-0 open:pb-4"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <Icon
                  name="chevronDown"
                  className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
                <span>{q.question}</span>
              </summary>
              <div className="space-y-3 px-4 ps-10">
                {q.intro?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {q.steps && (
                  <ol className="list-decimal space-y-1.5 ps-5">
                    {q.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )}
                {q.notes?.map((text) => (
                  <p key={text} className="muted">
                    {text}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </section>
      ))}
      <footer className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/privacidade" className="muted underline underline-offset-2 hover:text-fg">
          {tl('privacy')}
        </Link>
        {signedIn && (
          <Link href="/feedback" className="muted underline underline-offset-2 hover:text-fg">
            {tl('feedback')}
          </Link>
        )}
      </footer>
    </main>
  );
}
