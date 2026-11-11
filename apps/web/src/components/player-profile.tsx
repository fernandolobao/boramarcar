import type { AchievementId } from '@boramarcar/core';
import type { getDeckCovers, getPlayerProfile } from '@boramarcar/db';
import Link from 'next/link';
import { AvatarImage } from './avatar-image';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DeckGrid, type DeckRatings } from './deck-grid';
import { Icon, type IconName } from './icons';

type Profile = Awaited<ReturnType<typeof getPlayerProfile>>;

const ACHIEVEMENT_ICON: Record<AchievementId, IconName> = {
  first_game: 'firstGame',
  first_win: 'winner',
  games_10: 'events',
  games_50: 'veteran',
  wins_10: 'ranking',
  streak_3: 'streak',
  streak_5: 'streak',
  fast_win: 'fastWin',
  first_player_win: 'firstPlayer',
  deck_loyal: 'loyal',
  deck_variety: 'variety',
  versatile: 'versatile',
  team_win: 'team',
  season_champion: 'champion',
};

/** Selos de conquistas: desbloqueadas em destaque; bloqueadas com o progresso em texto. */
export async function Achievements({ achievements }: { achievements: Profile['achievements'] }) {
  const t = await getTranslations('achievements');
  const format = await getFormatter();
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <section className="card" aria-labelledby="achievements-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="achievements-title" className="section-title mb-0">
          {t('title')}
        </h2>
        <p className="muted text-sm">
          {t('unlocked', { count: unlocked, total: achievements.length })}
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              a.unlocked
                ? 'border-brand-400/60 bg-brand-50 dark:border-brand-400/40 dark:bg-brand-700/20'
                : 'border-ink-200 dark:border-ink-800'
            }`}
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-full ${
                a.unlocked
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400'
              }`}
            >
              <Icon name={a.unlocked ? ACHIEVEMENT_ICON[a.id] : 'private'} className="size-5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {t(`items.${a.id}.name`)}
                {a.count !== undefined && a.count > 1 && (
                  <span className="muted font-normal"> · {t('times', { count: a.count })}</span>
                )}
              </p>
              <p className="muted">{t(`items.${a.id}.description`)}</p>
              {a.unlocked && a.unlockedAt ? (
                <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-400">
                  {t('unlockedOn', {
                    date: format.dateTime(a.unlockedAt, { dateStyle: 'medium' }),
                  })}
                </p>
              ) : (
                <div className="mt-1.5">
                  <p className="muted text-xs">
                    <span className="sr-only">{t('locked')}. </span>
                    {t('progress', { current: a.progress, target: a.target })}
                  </p>
                  {a.target > 1 && (
                    <div
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(a.progress / a.target) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Perfil de um jogador: o próprio (/perfil) ou de alguém do grupo (/jogadores/:id). */
export async function PlayerProfile({
  profile,
  covers,
  ratings,
}: {
  profile: Profile;
  covers: Awaited<ReturnType<typeof getDeckCovers>>;
  ratings?: DeckRatings;
}) {
  const t = await getTranslations('profilePage');
  const tp = await getTranslations('player');
  const tg = await getTranslations('group');
  const format = await getFormatter();

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-700 dark:text-white">
          <AvatarImage name={profile.name} image={profile.image} sizes="80px" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title">{profile.name}</h1>
          {profile.email && (
            <p className="muted break-all" data-cs-mask>
              {profile.email}
            </p>
          )}
          <p className="muted text-sm">
            {t('memberSince', {
              date: format.dateTime(profile.memberSince, { month: 'long', year: 'numeric' }),
            })}
          </p>
        </div>
        {profile.isSelf && (
          <Link href="/configuracoes" className="btn-secondary ms-auto">
            <Icon name="settings" />
            {t('editSettings')}
          </Link>
        )}
      </div>

      <section className="card" aria-labelledby="profile-summary">
        <h2 id="profile-summary" className="section-title">
          {t('summary')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t('games'), format.number(profile.games)],
            [t('wins'), format.number(profile.wins)],
            [t('winRate'), format.number(profile.winRate, { style: 'percent' })],
            [t('decks'), format.number(profile.decks.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-ink-50 p-3 dark:bg-ink-900">
              <dt className="muted text-sm">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {profile.seasonTitles.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">{tp('seasonTitles')}</h3>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {profile.seasonTitles.map((s) => (
                <li
                  key={`${s.groupName}-${s.seasonName}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                >
                  <Icon name="champion" />
                  {tp('seasonTitle', { season: s.seasonName, group: s.groupName })}
                </li>
              ))}
            </ul>
          </>
        )}
        {profile.groups.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">
              {profile.isSelf ? t('groups', { count: profile.groups.length }) : tp('sharedGroups')}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {profile.groups.map((g) => (
                <li key={g.id} className="rounded-full bg-ink-100 px-3 py-1 dark:bg-ink-800">
                  {g.name} · <span className="muted">{tg(`roles.${g.role}`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Achievements achievements={profile.achievements} />

      <section className="space-y-3" aria-labelledby="profile-decks">
        <h2 id="profile-decks" className="section-title">
          {tp('decks')}
        </h2>
        {profile.decks.length === 0 ? (
          <p className="muted">{tp('noDecks')}</p>
        ) : (
          <DeckGrid
            decks={profile.decks}
            covers={covers}
            ratings={ratings}
            headingLevel={3}
            showVisibility={profile.isSelf}
          />
        )}
      </section>
    </>
  );
}
