import { isLessonId } from '@boramarcar/core/learn';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { LessonComplete } from '@/components/learn';
import { Logo } from '@/components/logo';
import { ManaText } from '@/components/mana';
import { getDb } from '@/server/db';
import { exampleCardImages } from '@/server/learn-cards';
import { pageMetadata } from '@/server/seo';
import { learnContext } from '../content';
import { PracticeCallout } from '@/components/practice-callout';

type Props = { params: Promise<{ licao: string }> };

async function lessonOf(params: Props['params']) {
  const { licao } = await params;
  if (!isLessonId(licao)) notFound();
  const ctx = await learnContext();
  const index = ctx.content.lessons.findIndex((l) => l.id === licao);
  return { ...ctx, index, lesson: ctx.content.lessons[index]! };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lesson, content } = await lessonOf(params);
  return pageMetadata({
    section: 'learn',
    path: `/aprender/${lesson.id}`,
    title: `${lesson.title} · ${content.title}`,
    description: lesson.summary,
    index: true,
  });
}

/**
 * Uma lição da trilha (12.1): seções com texto e cartas de exemplo, "Para lembrar", concluir
 * (com conta) e anterior/próxima.
 */
export default async function LessonPage({ params }: Props) {
  const { content, lesson, index, user, completed } = await lessonOf(params);
  const t = await getTranslations('learn');
  const tc = await getTranslations('common');
  const inTrack = content.lessons.filter((l) => l.track === lesson.track);
  const position = inTrack.findIndex((l) => l.id === lesson.id);
  const prev = content.lessons[index - 1];
  const next = content.lessons[index + 1];
  const images = await exampleCardImages(
    getDb(),
    lesson.sections.flatMap((s) => s.cards ?? []),
  );

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
          {t('allLessons')}
        </Link>
      </div>

      <header className="space-y-2">
        <p className="muted text-sm">
          {content.tracks[lesson.track].title} ·{' '}
          {t('lessonOf', { n: position + 1, total: inTrack.length })} ·{' '}
          {t('minutes', { count: lesson.minutes })}
        </p>
        <h1 className="page-title">{lesson.title}</h1>
        <p>{lesson.summary}</p>
      </header>

      {lesson.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-t`}
          className="space-y-3"
        >
          <h2 id={`${section.id}-t`} className="section-title mb-0">
            {section.heading}
          </h2>
          {section.paragraphs.map((text) => (
            <p key={text}>
              <ManaText text={text} />
            </p>
          ))}
          {section.cards && (
            <ul
              aria-label={t('examples')}
              className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
            >
              {section.cards.map((name) => {
                const src = images.get(name);
                return (
                  <li key={name}>
                    <figure className="space-y-1">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element -- imagem do Scryfall
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          className="aspect-[5/7] w-full rounded-[4.75%/3.5%] shadow-md"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex aspect-[5/7] w-full items-center justify-center rounded-xl border border-line-strong bg-surface p-2 text-center text-sm"
                        >
                          {name}
                        </div>
                      )}
                      <figcaption className="text-center text-sm">{name}</figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <aside aria-labelledby="lembrar" className="card space-y-2">
        <h2 id="lembrar" className="flex items-center gap-2 font-semibold">
          <Icon name="learn" />
          {t('remember')}
        </h2>
        <ul className="list-disc space-y-1 ps-5">
          {lesson.remember.map((text) => (
            <li key={text}>
              <ManaText text={text} />
            </li>
          ))}
        </ul>
      </aside>

      {/* Última lição da trilha: convite para praticar na mesa de testes (11.4). */}
      {inTrack.at(-1)?.id === lesson.id && <PracticeCallout signedIn={Boolean(user)} />}

      {/* Rodapé da lição: concluir à esquerda, anterior/próxima à direita (a próxima em destaque). */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {user ? (
          <LessonComplete lessonId={lesson.id} done={completed.includes(lesson.id)} />
        ) : (
          <Link
            href={`/entrar?para=/aprender/${lesson.id}`}
            className="text-sm text-link underline underline-offset-2"
          >
            {t('signInToSave')}
          </Link>
        )}
        <nav aria-label={t('lessonsNav')} className="flex flex-wrap gap-2">
          {prev && (
            <Link href={`/aprender/${prev.id}`} className="btn-secondary">
              <Icon name="previous" />
              <span>
                <span className="sr-only">{t('previous')}: </span>
                {prev.title}
              </span>
            </Link>
          )}
          {next ? (
            <Link href={`/aprender/${next.id}`} className="btn-primary">
              <span>
                <span className="sr-only">{t('next')}: </span>
                {next.title}
              </span>
              <Icon name="next" />
            </Link>
          ) : (
            <Link href="/aprender" className="btn-primary">
              {t('allLessons')}
              <Icon name="next" />
            </Link>
          )}
        </nav>
      </div>
    </main>
  );
}
