'use client';

import { GAME_FORMATS, type GameFormat } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';
import { ManaSymbol } from './mana';

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;

/**
 * Identidade de cor com os símbolos de mana reais (cada cor tem um desenho próprio, então a cor
 * não é a única pista) e os nomes em texto para leitores de tela.
 */
export function ColorIdentity({ colors, size = 'md' }: { colors: string[]; size?: 'sm' | 'md' }) {
  const t = useTranslations('decks');
  const list = COLOR_ORDER.filter((c) => colors.includes(c));
  const shown = list.length ? list : (['C'] as const);
  const names = shown.map((c) => t(`colors.${c}`)).join(', ');
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
      <span className="sr-only">
        {t('colorIdentity')}: {names}
      </span>
      {shown.map((c) => (
        <span key={c} title={t(`colors.${c}`)} className="inline-flex">
          <ManaSymbol symbol={c} />
        </span>
      ))}
    </span>
  );
}

/** Nome e tipo de jogo do deck (dono). */
export function DeckSettingsForm({
  deckId,
  name,
  format,
}: {
  deckId: string;
  name: string;
  format: GameFormat;
}) {
  const t = useTranslations('decks');
  const tf = useTranslations('formats');
  const tc = useTranslations('common');
  const { run, error, pending } = useApiAction();
  const [values, setValues] = useState({ name, format });
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () => api(`/api/v1/decks/${deckId}`, { method: 'PATCH', body: values }),
          () => setSaved(true),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="deck-name">
          {t('name')}
        </label>
        <input
          id="deck-name"
          className="input"
          required
          maxLength={120}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="label" htmlFor="deck-format">
          {t('format')}
        </label>
        <select
          id="deck-format"
          className="select"
          value={values.format}
          onChange={(e) => setValues((v) => ({ ...v, format: e.target.value as GameFormat }))}
        >
          {GAME_FORMATS.map((f) => (
            <option key={f} value={f}>
              {tf(f)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>
        <Icon name="save" />
        {tc('save')}
      </button>
      {saved && !error && (
        <p role="status" className="muted sm:col-span-3">
          {t('saved')}
        </p>
      )}
      <div className="sm:col-span-3">
        <FormError message={error} />
      </div>
    </form>
  );
}
