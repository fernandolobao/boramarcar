'use client';

import {
  DECK_VISIBILITIES,
  GAME_FORMATS,
  type DeckVisibility,
  type GameFormat,
} from '@boramarcar/core';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';
import { ManaSymbol } from './mana';
import { Choices } from './ds/choices';
import { Select } from '@/components/ds/select';

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
  visibility = 'group',
  draft = false,
  onSaved,
}: {
  deckId: string;
  name: string;
  format: GameFormat;
  visibility?: DeckVisibility;
  /** Rascunho: sempre privado; a visibilidade é escolhida ao publicar. */
  draft?: boolean;
  /** Depois de salvar (ex.: fechar a janela de edição). */
  onSaved?: () => void;
}) {
  const t = useTranslations('decks');
  const tf = useTranslations('formats');
  const tc = useTranslations('common');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const [values, setValues] = useState({ name, format, visibility });
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () =>
            api(`/api/v1/decks/${deckId}`, {
              method: 'PATCH',
              // Rascunho não muda de visibilidade (o servidor recusa).
              body: draft ? { name: values.name, format: values.format } : values,
            }),
          () => {
            setSaved(true);
            // A página mostra o nome, o formato e a visibilidade novos (e o "Compartilhar deck").
            router.refresh();
            onSaved?.();
          },
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
        <Select
          label={t('format')}
          id="deck-format"
          value={String(values.format)}
          onChange={(f) => setValues((v) => ({ ...v, format: f as GameFormat }))}
          options={GAME_FORMATS.map((f) => ({ value: String(f), label: tf(f) }))}
        />
      </div>
      <Choices
        className="sm:col-span-3"
        label={t('visibilityLabel')}
        variant="cards"
        name="deck-visibility"
        value={draft ? 'private' : values.visibility}
        onChange={(v) => setValues((s) => ({ ...s, visibility: v }))}
        description={draft ? t('draft.visibilityLocked') : undefined}
        options={DECK_VISIBILITIES.map((v) => ({
          value: v,
          label: t(`visibility.${v}`),
          description: t(`visibilityHint.${v}`),
          disabled: draft,
        }))}
        icons={Object.fromEntries(DECK_VISIBILITIES.map((v) => [v, <Icon key={v} name={v} />]))}
      />
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
