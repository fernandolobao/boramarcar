'use client';

import type { DeckVisibility, GameFormat } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { DeckSettingsForm } from './deck-visual';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';
import { useLightDismiss } from './use-light-dismiss';

/**
 * "Editar deck" (só o dono): botão no canto do topo da página que abre uma janela com nome, tipo
 * de jogo e visibilidade e, no fim, a zona de perigo para remover o deck (dois cliques). Salvar
 * fecha a janela e atualiza a página; o foco volta ao botão.
 */
export function DeckEditDialog({
  deckId,
  name,
  format,
  visibility,
}: {
  deckId: string;
  name: string;
  format: GameFormat;
  visibility: DeckVisibility;
}) {
  const t = useTranslations('decks');
  const router = useRouter();
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useLightDismiss(ref);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { run, error, pending } = useApiAction();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="btn-secondary"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Icon name="edit" />
        {t('settings')}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto max-h-[92dvh] w-[min(94vw,40rem)] overflow-y-auto rounded-2xl bg-surface p-5 text-fg shadow-2xl backdrop:bg-noite/70"
        onClose={() => {
          setOpen(false);
          setConfirming(false);
          opener.current?.focus();
        }}
      >
        {open && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-2xl font-semibold">
                {t('settings')}
              </h2>
              <button
                type="button"
                className="btn-secondary px-3"
                title={t('close')}
                onClick={() => ref.current?.close()}
              >
                <Icon name="close" />
                <span className="sr-only">{t('close')}</span>
              </button>
            </div>
            <DeckSettingsForm
              deckId={deckId}
              name={name}
              format={format}
              visibility={visibility}
              onSaved={() => ref.current?.close()}
            />
            <section
              aria-labelledby={`${titleId}-danger`}
              className="space-y-2 rounded-xl border border-red-300 p-4 dark:border-red-800"
            >
              <h3 id={`${titleId}-danger`} className="font-semibold">
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
        )}
      </dialog>
    </>
  );
}
