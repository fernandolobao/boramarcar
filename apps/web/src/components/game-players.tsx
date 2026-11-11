import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';
import { PlayerLink } from '@/components/player-link';
import { CardNames } from './card-dialog';

export interface GamePlayerView {
  userId: string;
  name: string;
  result: 'win' | 'loss' | 'draw';
  team: number | null;
  eliminatedOrder: number | null;
  deckName: string | null;
  deck: {
    artUri: string | null;
    cards: { name: string }[];
  } | null;
}

/**
 * Jogadores de uma partida com o deck usado (2.4): arte do comandante como miniatura
 * (decorativa — o nome do deck e do comandante estão em texto) e resultado em texto, não só cor.
 */
export function GamePlayers({
  players,
  showTeams,
}: {
  players: GamePlayerView[];
  showTeams: boolean;
}) {
  const t = useTranslations('events');
  const groups = showTeams
    ? [...new Set(players.map((p) => p.team ?? 0))].map((team) => ({
        team,
        players: players.filter((p) => (p.team ?? 0) === team),
      }))
    : [{ team: null, players }];

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => (
        <div key={group.team ?? 'all'}>
          {group.team !== null && (
            <p className="mb-1 text-sm font-semibold">{t('teamName', { number: group.team })}</p>
          )}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.players.map((p) => {
              const commanders = p.deck?.cards.map((c) => c.name).filter((n) => n !== p.deckName);
              return (
                <li
                  key={p.userId}
                  className={`flex min-w-0 items-center gap-3 rounded-lg p-2 ${
                    p.result === 'win'
                      ? 'bg-emerald-50 ring-1 ring-emerald-700/40 dark:bg-emerald-950/50 dark:ring-emerald-400/40'
                      : 'bg-ink-50 dark:bg-ink-900'
                  }`}
                >
                  {p.deck?.artUri && (
                    <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-ink-200 dark:bg-ink-800">
                      <Image
                        src={p.deck.artUri}
                        alt=""
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-x-1.5">
                      {p.result === 'win' && (
                        <Icon
                          name="winner"
                          className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                        />
                      )}
                      <PlayerLink
                        userId={p.userId}
                        name={p.name}
                        className={p.result === 'win' ? 'font-semibold' : 'font-medium'}
                      />
                      <span className="muted">
                        · {t(`result.${p.result}`)}
                        {p.eliminatedOrder != null &&
                          ` · ${t('eliminatedPosition', { position: p.eliminatedOrder })}`}
                      </span>
                    </p>
                    {p.deckName && (
                      <p className="muted truncate">
                        {p.deckName}
                        {commanders && commanders.length > 0 && (
                          <>
                            {' — '}
                            <CardNames names={commanders} separator=" & " />
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
