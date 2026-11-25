import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { HistoryBackLink } from '@/components/history-back-link';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { pageMetadata } from '@/server/seo';
import { learnContext } from './content';

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await learnContext();
  return pageMetadata({ section: 'learn', path: '/aprender', title: content.title, index: true });
}

/**
 * Trilha "Aprender a jogar" (12.1): aberta sem conta. Lista as lições na ordem, com o tempo de
 * leitura e, para quem tem conta, o progresso (texto + barra decorativa).
 */
export default async function LearnPage() {
  const { content, links, user, completed } = await learnContext();
  const t = await getTranslations('learn');
  const tc = await getTranslations('common');
  const total = content.lessons.length;
  const next = content.lessons.find((l) => !completed.includes(l.id)) ?? content.lessons[0]!;

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
          fallback={user ? '/painel' : '/'}
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tc('back')}
        </HistoryBackLink>
      </div>
      <header className="space-y-3">
        <h1 className="page-title flex items-center gap-2">
          <Icon name="lessons" className="size-7 shrink-0" />
          {content.title}
        </h1>
        <p>{content.intro}</p>
        {user && (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t('progress', { done: completed.length, total })}
            </p>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(completed.length / total) * 100}%` }}
              />
            </div>
          </div>
        )}
        <Link href={`/aprender/${next.id}`} className="btn-primary">
          <Icon name="next" />
          {completed.length === 0
            ? t('start')
            : completed.length === total
              ? t('review')
              : t('continue')}
        </Link>
        {!user && (
          <p className="muted text-sm">
            <Link href="/entrar?para=/aprender" className="text-link underline underline-offset-2">
              {t('signInToSave')}
            </Link>
          </p>
        )}
      </header>

      <section aria-labelledby="licoes" className="space-y-3">
        <h2 id="licoes" className="section-title mb-0">
          {t('lessons')}
        </h2>
        <ol className="space-y-3">
          {content.lessons.map((lesson, i) => {
            const done = completed.includes(lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/aprender/${lesson.id}`}
                  className="card flex items-start gap-4 hover:border-line-strong"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-semibold ${
                      done ? 'border-primary bg-primary text-on-primary' : 'border-line-strong'
                    }`}
                  >
                    {done ? <Icon name="done" /> : i + 1}
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block font-semibold">
                      <span className="sr-only">{t('lessonOf', { n: i + 1, total })}: </span>
                      {lesson.title}
                    </span>
                    <span className="block text-sm">{lesson.summary}</span>
                    <span className="muted block text-sm">
                      {t('minutes', { count: lesson.minutes })}
                      {done && ` · ${t('done')}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="oficial" className="card space-y-2">
        <h2 id="oficial" className="section-title mb-0">
          {content.official.title}
        </h2>
        <p className="text-sm">{content.official.text}</p>
        <ul className="space-y-1 text-sm">
          {[
            [links.rules, content.official.rules],
            [links.glossary, content.official.glossary],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-link underline underline-offset-2"
              >
                {label}
                <Icon name="externalLink" className="size-4" />
                <span className="sr-only">{tc('newTab')}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
