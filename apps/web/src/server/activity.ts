import 'server-only';
import type { ActivityKind } from '@boramarcar/core';
import { getDeckName, recordActivity } from '@boramarcar/db';
import { runAfterResponse } from './background';
import { getDb } from './db';

/**
 * Registra uma ação no registro de atividade do Admin, **depois** da resposta (quem usa não
 * espera). Ações de deck sem nome buscam o nome do deck nessa hora. Falha só vai para o log.
 */
export function track(input: {
  userId: string;
  kind: ActivityKind;
  groupId?: string | null;
  targetId?: string | null;
  label?: string | null;
  count?: number;
}) {
  runAfterResponse(async () => {
    try {
      const db = getDb();
      const label =
        input.label ??
        (input.kind.startsWith('deck_') && input.targetId
          ? await getDeckName(db, input.targetId)
          : null);
      await recordActivity(db, { ...input, label });
    } catch (error) {
      console.error('[atividade] falha ao registrar', error);
    }
  });
}
