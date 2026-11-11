import { MAX_COLLECTION_COPIES, removeCollectionCard, updateCollectionCard } from '@boramarcar/db';
import { DomainError } from '@boramarcar/core';
import { z } from 'zod';
import { resolveCardById } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

const schema = z
  .object({
    quantity: z.number().int().min(0).max(MAX_COLLECTION_COPIES).optional(),
    foil: z.boolean().optional(),
    /** Outra impressão da mesma carta. */
    scryfallId: z.string().min(1).max(64).optional(),
  })
  .refine((v) => v.quantity !== undefined || v.foil !== undefined || v.scryfallId, {
    message: 'Informe quantity, foil ou scryfallId',
  });

/** Quantidade (0 remove), foil ou impressão de uma linha da coleção. */
export const PATCH = authed<{ entryId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  const card = body.scryfallId ? await resolveCardById(db, body.scryfallId) : undefined;
  if (card === null) throw new DomainError('not_found', 'Impressão não encontrada no Scryfall');
  return updateCollectionCard(db, {
    userId: user.id,
    id: params.entryId,
    quantity: body.quantity,
    foil: body.foil,
    card,
  });
});

export const DELETE = authed<{ entryId: string }>(async ({ db, user, params }) => {
  await removeCollectionCard(db, { userId: user.id, id: params.entryId });
});
