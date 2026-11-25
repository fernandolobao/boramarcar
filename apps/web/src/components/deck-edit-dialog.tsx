'use client';

import type { DeckVisibility, GameFormat } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { DeckSettingsForm } from './deck-visual';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/**
 * Conteúdo de "Editar deck" (só o dono), aberto pelo menu de opções do deck: nome, tipo de jogo e
 * visibilidade e, no fim, a zona de perigo para remover o deck (dois cliques). Salvar chama
 * `onSaved` (fecha a janela; o formulário atualiza a página).
 */
export function DeckEditContent({
  deckId,
  name,
  format,
  visibility,
  draft = false,
  onSaved,
}: {
  deckId: string;
  name: string;
  format: GameFormat;
  visibility: DeckVisibility;
  /** Rascunho: visibilidade travada em privado (escolhida ao publicar). */
  draft?: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations('decks');
  const router = useRouter();
  const id = useId();
  const [confirming, setConfirming] = useState(false);
  const { run, error, pending } = useApiAction();
  return (
    <div className="space-y-6">
      <DeckSettingsForm
        deckId={deckId}
        name={name}
        format={format}
        visibility={visibility}
        draft={draft}
        onSaved={onSaved}
      />
      <section
        aria-labelledby={`${id}-danger`}
        className="space-y-2 rounded-xl border border-red-300 p-4 dark:border-red-800"
      >
        <h3 id={`${id}-danger`} className="font-semibold">
          {t('dangerZone')}
        </h3>
        <p className="muted text-sm">{t('deleteDeckHint')}</p>
        <button
          type="button"
          className={
            confirming ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'
          }
          disabled={pending}
          aria-label={confirming ? undefined : t('deleteDeck', { name })}
          onBlur={() => setConfirming(false)}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            setConfirming(false);
            void run(
              () => api(`/api/v1/decks/${deckId}`, { method: 'DELETE' }),
              () => router.push('/decks'),
            );
          }}
        >
          <Icon name="delete" />
          {confirming ? t('confirmRemove') : t('removeDeck')}
        </button>
        <FormError message={error} />
      </section>
    </div>
  );
}
