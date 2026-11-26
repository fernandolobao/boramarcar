'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { ManaText } from './mana';
import { FormError, useApiAction } from './use-api-action';

/**
 * Carta fora da identidade de cor do comandante (11.5): as cores que quebram a regra (símbolos
 * com o nome por extenso) e, para o dono, "Mover para Talvez" ou "Remover" (dois cliques).
 */
export function IdentityFix({
  deckId,
  name,
  colors,
  canEdit,
}: {
  deckId: string;
  name: string;
  colors: readonly string[];
  canEdit: boolean;
}) {
  const t = useTranslations('analysis.identity');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const [confirming, setConfirming] = useState(false);
  const move = (to: 'maybeboard' | null) =>
    void run(
      () =>
        api(`/api/v1/decks/${deckId}/lines/move`, {
          method: 'POST',
          body: { name, from: 'mainboard', to },
        }),
      () => router.refresh(),
    );
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2">
      <span className="text-fg-muted">
        {t('colors')} <ManaText text={colors.map((c) => `{${c}}`).join('')} />
      </span>
      {canEdit && (
        <>
          <button
            type="button"
            className="btn-secondary min-h-9 px-3 text-xs"
            disabled={pending}
            aria-label={t('toMaybeLabel', { name })}
            onClick={() => move('maybeboard')}
          >
            <Icon name="next" />
            {t('toMaybe')}
          </button>
          <button
            type="button"
            className={
              confirming
                ? 'btn-danger min-h-9 border border-red-300 px-3 text-xs dark:border-red-800'
                : 'btn-danger min-h-9 px-3 text-xs'
            }
            disabled={pending}
            aria-label={confirming ? undefined : t('removeLabel', { name })}
            onBlur={() => setConfirming(false)}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              setConfirming(false);
              move(null);
            }}
          >
            <Icon name="delete" />
            {confirming ? t('confirmRemove', { name }) : t('remove')}
          </button>
        </>
      )}
      <FormError message={error} />
    </span>
  );
}
