'use client';

import { GAME_FORMATS, type GameFormat } from '@boramarcar/core';
import { tournamentShape } from '@boramarcar/core/tournaments';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Checkbox } from '../ds/checkbox';
import { Choices } from '../ds/choices';
import { NumberField } from '../ds/number-field';
import { Select } from '../ds/select';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

/** Criar torneio (9.1): encontro, nome, formato e, se quiser, melhor de N, rodadas e pontos. */
export function TournamentForm({
  events,
  defaultEventId,
  defaultFormat,
}: {
  events: { id: string; title: string; startsAt: string }[];
  defaultEventId: string | null;
  defaultFormat: GameFormat;
}) {
  const t = useTranslations('tournaments');
  const tf = useTranslations('formats');
  const format = useFormatter();
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [eventId, setEventId] = useState(defaultEventId ?? events[0]?.id ?? '');
  const [name, setName] = useState('');
  const [game, setGame] = useState<GameFormat>(defaultFormat);
  const shape = tournamentShape(game);
  const [bestOf, setBestOf] = useState<'1' | '3'>('3');
  const [rounds, setRounds] = useState<number | null>(null);
  const [win, setWin] = useState<number | null>(3);
  const [draw, setDraw] = useState<number | null>(1);
  const [loss, setLoss] = useState<number | null>(0);
  const [counts, setCounts] = useState(true);
  const hint = shape.entrantSize === 2 ? t('tableHint.duo') : t(`tableHint.${shape.table}`);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api<{ tournament: { id: string } }>(`/api/v1/events/${eventId}/tournaments`, {
              method: 'POST',
              body: {
                name,
                format: game,
                bestOf: shape.table === 'pair' ? Number(bestOf) : 1,
                rounds,
                points: { win: win ?? 0, draw: draw ?? 0, loss: loss ?? 0 },
                countsInRanking: counts,
              },
            }),
          (r) => router.push(`/torneios/${r.tournament.id}`),
        );
      }}
    >
      <Select
        label={t('eventLabel')}
        value={eventId}
        onChange={setEventId}
        options={events.map((e) => ({
          value: e.id,
          label: `${e.title} · ${format.dateTime(new Date(e.startsAt), { dateStyle: 'medium' })}`,
        }))}
      />
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          {t('name')}
        </label>
        <input
          id={`${id}-name`}
          className="input"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Select
        label={t('format')}
        value={game}
        onChange={setGame}
        description={hint}
        options={GAME_FORMATS.map((f) => ({ value: f, label: tf(f) }))}
      />
      {shape.table === 'pair' && (
        <Choices
          label={t('bestOf')}
          value={bestOf}
          onChange={setBestOf}
          options={[
            { value: '1', label: t('bestOfOption', { count: 1 }) },
            { value: '3', label: t('bestOfOption', { count: 3 }) },
          ]}
        />
      )}
      <NumberField
        label={t('rounds')}
        value={rounds}
        onChange={setRounds}
        min={1}
        max={15}
        description={t('roundsHint')}
      />
      <fieldset>
        <legend className="label">{t('points')}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label={t('pointsWin')} value={win} onChange={setWin} min={0} max={20} />
          <NumberField label={t('pointsDraw')} value={draw} onChange={setDraw} min={0} max={20} />
          <NumberField label={t('pointsLoss')} value={loss} onChange={setLoss} min={0} max={20} />
        </div>
      </fieldset>
      <Checkbox label={t('countsInRanking')} checked={counts} onChange={setCounts} />
      <FormError message={error} />
      <button className="btn-primary" disabled={pending || !eventId || !name.trim()}>
        <Icon name="add" />
        {t('create')}
      </button>
    </form>
  );
}
