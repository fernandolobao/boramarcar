'use client';

import { useTimeZone, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GameResult } from '@boramarcar/core';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';

export function NewEventForm({
  groupId,
  locations,
}: {
  groupId: string;
  locations: { id: string; name: string }[];
}) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const router = useRouter();
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [title, setTitle] = useState(t('defaultTitle'));
  const [startsAt, setStartsAt] = useState('');
  const [locationId, setLocationId] = useState('');

  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api<{ event: { id: string } }>(`/api/v1/groups/${groupId}/events`, {
              method: 'POST',
              body: {
                title,
                startsAt: zonedLocalToUtc(startsAt, timeZone).toISOString(),
                locationId: locationId || null,
              },
            }),
          ({ event }) => router.push(`/eventos/${event.id}`),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="event-title">
          {t('eventTitle')}
        </label>
        <input
          id="event-title"
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="event-start">
          {t('when')}
        </label>
        <input
          id="event-start"
          type="datetime-local"
          className="input"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="event-location">
          {t('where')}
        </label>
        <select
          id="event-location"
          className="select"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">{tc('locationTbd')}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>
        {t('new')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: 'yes' | 'maybe' | 'no' | null;
}) {
  const t = useTranslations('events.rsvp');
  const te = useTranslations('events');
  const { run, pending } = useApiAction();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={te('rsvpLabel')}>
      {(['yes', 'maybe', 'no'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          disabled={pending}
          className={current === value ? 'btn-primary' : 'btn-secondary'}
          onClick={() =>
            void run(() =>
              api(`/api/v1/events/${eventId}/rsvp`, { method: 'PUT', body: { rsvp: value } }),
            )
          }
        >
          {t(value)}
        </button>
      ))}
    </div>
  );
}

interface PlayerOption {
  userId: string;
  name: string;
  decks: { id: string; name: string }[];
}

export function RecordGameForm({ eventId, players }: { eventId: string; players: PlayerOption[] }) {
  const t = useTranslations('events');
  const { run, error, pending } = useApiAction();
  const [playing, setPlaying] = useState<string[]>(players.slice(0, 4).map((p) => p.userId));
  const [winner, setWinner] = useState<string>('');
  const [isDraw, setIsDraw] = useState(false);
  const [deckByPlayer, setDeckByPlayer] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const payload = useMemo(
    () =>
      playing.map((userId, index) => ({
        userId,
        seat: index + 1,
        deckId: deckByPlayer[userId] || null,
        result: (isDraw ? 'draw' : userId === winner ? 'win' : 'loss') as GameResult,
      })),
    [playing, deckByPlayer, isDraw, winner],
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api(`/api/v1/events/${eventId}/games`, {
              method: 'POST',
              body: { players: payload, notes: notes || null },
            }),
          () => {
            setWinner('');
            setIsDraw(false);
            setNotes('');
          },
        );
      }}
    >
      <table className="w-full text-sm">
        <thead className="text-left text-zinc-600 dark:text-zinc-400">
          <tr>
            <th scope="col" className="py-1">
              {t('playing')}
            </th>
            <th scope="col" className="py-1">
              {t('result.win')}
            </th>
            <th scope="col" className="py-1">
              {t('deck')}
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const isPlaying = playing.includes(player.userId);
            return (
              <tr key={player.userId} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPlaying}
                      onChange={(e) =>
                        setPlaying((prev) =>
                          e.target.checked
                            ? [...prev, player.userId]
                            : prev.filter((id) => id !== player.userId),
                        )
                      }
                    />
                    {player.name}
                  </label>
                </td>
                <td className="py-2">
                  <input
                    type="radio"
                    name="winner"
                    aria-label={`${t('result.win')}: ${player.name}`}
                    disabled={!isPlaying || isDraw}
                    checked={winner === player.userId}
                    onChange={() => setWinner(player.userId)}
                  />
                </td>
                <td className="py-2">
                  <select
                    className="select"
                    aria-label={`${t('deck')}: ${player.name}`}
                    disabled={!isPlaying || player.decks.length === 0}
                    value={deckByPlayer[player.userId] ?? ''}
                    onChange={(e) =>
                      setDeckByPlayer((prev) => ({ ...prev, [player.userId]: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {player.decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDraw} onChange={(e) => setIsDraw(e.target.checked)} />
        {t('isDraw')}
      </label>
      <div>
        <label className="label" htmlFor="game-notes">
          {t('notes')}
        </label>
        <input
          id="game-notes"
          className="input"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        className="btn-primary"
        disabled={pending || playing.length < 2 || (!isDraw && !winner)}
      >
        {t('recordGame')}
      </button>
      <FormError message={error} />
    </form>
  );
}
