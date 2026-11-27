import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { pageMetadata } from '@/server/seo';
import {
  CHALLENGE_LEVELS,
  CHALLENGES,
  challengeLevel,
  isLessonId,
  TRACK_IDS,
} from '@boramarcar/core/learn';
import { learnContext } from './content';
import { PracticeCallout } from '@/components/practice-callout';

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await learnContext();
  return pageMetadata({ section: 'learn', path: '/aprender', title: content.title, index: true });
}

/**
 * Trilha "Aprender a jogar" (12.1): aberta sem conta. Lista as lições na ordem, com o tempo de
 * leitura e, para quem tem conta, o progresso (texto + barra decorativa).
 */
export default async function LearnPage() {
  const { content, links, user, completed: done, locale } = await learnContext();
  /** Só as lições contam no progresso da trilha (os desafios têm o próprio bloco). */
  const completed = done.filter(isLessonId);
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
        {/* Destino fixo: voltar no histórico levaria à última lição aberta, não ao painel. */}
        <Link
          href={user ? '/painel' : '/'}
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {tc('back')}
        </Link>
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
        <div className="flex flex-wrap gap-2">
          <Link href={`/aprender/${next.id}`} className="btn-primary">
            <Icon name="next" />
            {completed.length === 0
              ? t('start')
              : completed.length === total
                ? t('review')
                : t('continue')}
          </Link>
          <Link href="/aprender/glossario" className="btn-secondary">
            <Icon name="lessons" />
            {t('glossary.title')}
          </Link>
        </div>
        {!user && (
          <p className="muted text-sm">
            <Link href="/entrar?para=/aprender" className="text-link underline underline-offset-2">
              {t('signInToSave')}
            </Link>
          </p>
        )}
      </header>

      {TRACK_IDS.map((track) => {
        const lessons = content.lessons.filter((l) => l.track === track);
        const doneInTrack = lessons.filter((l) => completed.includes(l.id)).length;
        return (
          <section key={track} aria-labelledby={`bloco-${track}`} className="space-y-3">
            <div className="space-y-1">
              <h2 id={`bloco-${track}`} className="section-title mb-0">
                {content.tracks[track].title}
              </h2>
              <p className="text-sm">{content.tracks[track].intro}</p>
              {user && (
                <p className="muted text-sm">
                  {t('trackProgress', { done: doneInTrack, total: lessons.length })}
                </p>
              )}
            </div>
            <ol className="space-y-3">
              {lessons.map((lesson, i) => {
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
                          <span className="sr-only">
                            {t('lessonOf', { n: i + 1, total: lessons.length })}:{' '}
                          </span>
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
        );
      })}

      {/* Desafios guiados (12.4): situações de mesa com respostas comentadas. */}
      <section aria-labelledby="bloco-desafios" className="space-y-3">
        <div className="space-y-1">
          <h2 id="bloco-desafios" className="section-title mb-0">
            {t('challenges.title')}
          </h2>
          <p className="text-sm">{t('challenges.intro')}</p>
        </div>
        {/* Um grupo por nível: o básico e "Além do básico", cada um com o seu progresso. */}
        {CHALLENGE_LEVELS.map((level) => {
          const list = CHALLENGES.filter((c) => challengeLevel(c) === level);
          return (
            <section key={level} aria-labelledby={`desafios-${level}`} className="space-y-2">
              <h3 id={`desafios-${level}`} className="font-semibold">
                {t(`challenges.levels.${level}`)}
              </h3>
              {user && (
                <p className="muted text-sm">
                  {t('trackProgress', {
                    done: list.filter((c) => done.includes(c.id)).length,
                    total: list.length,
                  })}
                </p>
              )}
              <ol className="grid gap-3 sm:grid-cols-2">
                {list.map((c, i) => {
                  const solved = done.includes(c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/aprender/desafios/${c.id}`}
                        className="card flex h-full items-start gap-4 hover:border-line-strong"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-semibold ${
                            solved
                              ? 'border-primary bg-primary text-on-primary'
                              : 'border-line-strong'
                          }`}
                        >
                          {solved ? <Icon name="done" /> : i + 1}
                        </span>
                        <span className="min-w-0 space-y-1">
                          <span className="block font-semibold">
                            <span className="sr-only">
                              {t('challenges.of', { n: i + 1, total: list.length })}:{' '}
                            </span>
                            {c[locale].title}
                          </span>
                          <span className="block text-sm">{c[locale].question}</span>
                          {solved && (
                            <span className="muted block text-sm">{t('challenges.solved')}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </section>

      {/* Pratique sozinho: a mesa de testes com um deck (11.4). */}
      <PracticeCallout signedIn={Boolean(user)} />

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
