import {
  CHALLENGES,
  challengeLevel,
  challengeOptions,
  isChallengeId,
  type ChallengeSide,
} from '@boramarcar/core/learn';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChallengeQuiz } from '@/components/challenge-quiz';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { ManaText } from '@/components/mana';
import { getDb } from '@/server/db';
import { exampleCardImages } from '@/server/learn-cards';
import { pageMetadata } from '@/server/seo';
import { learnContext } from '../../content';

type Props = { params: Promise<{ desafio: string }> };

async function challengeOf(params: Props['params']) {
  const { desafio } = await params;
  if (!isChallengeId(desafio)) notFound();
  const ctx = await learnContext();
  const challenge = CHALLENGES.find((c) => c.id === desafio)!;
  // Numeração e "próximo" dentro do nível (o básico ou "Além do básico").
  const level = CHALLENGES.filter((c) => challengeLevel(c) === challengeLevel(challenge));
  const index = level.indexOf(challenge);
  return { ...ctx, index, level, challenge, text: challenge[ctx.locale] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { challenge, text } = await challengeOf(params);
  const t = await getTranslations('learn.challenges');
  return pageMetadata({
    section: 'learn',
    path: `/aprender/desafios/${challenge.id}`,
    title: `${text.title} · ${t('title')}`,
    description: text.question,
    index: true,
  });
}

/** Área de um jogador na mesa do desafio (como no modo mesa: vida grande e as cartas). */
function Area({
  label,
  side,
  images,
  lifeLabel,
}: {
  label: string;
  side: ChallengeSide;
  images: Map<string, string>;
  lifeLabel: string;
}) {
  return (
    <section
      aria-label={label}
      className="space-y-3 rounded-2xl border border-line-strong bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{label}</h3>
        <p className="text-sm">
          <span className="font-display text-2xl font-semibold tabular-nums">{side.life}</span>{' '}
          {lifeLabel}
        </p>
      </div>
      {side.extra && (
        <p className="muted text-sm">
          <ManaText text={side.extra} />
        </p>
      )}
      {side.cards.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {side.cards.map((card, i) => {
            const src = images.get(card.name);
            return (
              <li key={`${card.name}-${i}`}>
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
                      className="flex aspect-[5/7] w-full items-center justify-center rounded-xl border border-line-strong bg-canvas p-2 text-center text-xs"
                    >
                      {card.name}
                    </div>
                  )}
                  <figcaption className="text-center text-xs">
                    <span className="font-medium">{card.name}</span>
                    {card.note && <span className="muted block">{card.note}</span>}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Um desafio guiado (12.4): a mesa, a pergunta e as respostas comentadas. */
export default async function ChallengePage({ params }: Props) {
  const { challenge, text, index, level, user, locale } = await challengeOf(params);
  const t = await getTranslations('learn');
  const tc = await getTranslations('common');
  const next = level[index + 1];
  const images = await exampleCardImages(getDb(), [
    ...text.you.cards.map((c) => c.name),
    ...text.opponent.cards.map((c) => c.name),
  ]);
  const lesson = (await learnContext()).content.lessons.find((l) => l.id === challenge.lesson);

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
          href="/aprender#bloco-desafios"
          className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:underline"
        >
          <Icon name="back" />
          {t('challenges.all')}
        </Link>
      </div>

      <header className="space-y-2">
        <p className="muted text-sm">
          {t(`challenges.levels.${challengeLevel(challenge)}`)} ·{' '}
          {t('challenges.of', { n: index + 1, total: level.length })}
        </p>
        <h1 className="page-title">{text.title}</h1>
        <p>
          <ManaText text={text.situation} />
        </p>
      </header>

      <section aria-labelledby="mesa" className="space-y-3">
        <h2 id="mesa" className="section-title mb-0">
          {t('challenges.board')}
        </h2>
        <Area
          label={t('challenges.opponent')}
          side={text.opponent}
          images={images}
          lifeLabel={t('challenges.life')}
        />
        <Area
          label={t('challenges.you')}
          side={text.you}
          images={images}
          lifeLabel={t('challenges.life')}
        />
      </section>

      <ChallengeQuiz
        key={locale}
        challengeId={challenge.id}
        question={text.question}
        options={challengeOptions(challenge, locale)}
        signedIn={Boolean(user)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {lesson ? (
          <Link
            href={`/aprender/${lesson.id}`}
            className="text-sm text-link underline underline-offset-2"
          >
            {t('challenges.review', { lesson: lesson.title })}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/aprender/desafios/${next.id}`} className="btn-primary">
            <span>
              <span className="sr-only">{t('next')}: </span>
              {next[locale].title}
            </span>
            <Icon name="next" />
          </Link>
        ) : (
          <Link href="/aprender#bloco-desafios" className="btn-primary">
            {t('challenges.all')}
            <Icon name="next" />
          </Link>
        )}
      </div>
      {!user && (
        <p className="muted text-sm">
          <Link
            href={`/entrar?para=/aprender/desafios/${challenge.id}`}
            className="text-link underline underline-offset-2"
          >
            {t('signInToSave')}
          </Link>
        </p>
      )}
    </main>
  );
}
