import { addCollectionCard, listCollection, MAX_COLLECTION_COPIES } from '@boramarcar/db';
import { DomainError } from '@boramarcar/core';
import { z } from 'zod';
import { resolveCardById, resolveCardByName } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

/** A coleção inteira de quem pede (filtros e ordem ficam no cliente). */
export const GET = authed(async ({ db, user }) => ({
  cards: await listCollection(db, user.id),
}));

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  /** Impressão escolhida; sem valor, a padrão do Scryfall. */
  scryfallId: z.string().min(1).max(64).optional(),
  quantity: z.number().int().min(1).max(MAX_COLLECTION_COPIES),
  foil: z.boolean().default(false),
});

/** Acrescenta cópias de uma carta (procurada no Scryfall pelo nome ou pela impressão). */
export const POST = authed(
  async ({ req, db, user }) => {
    const body = await parseJson(req, schema);
    const card = body.scryfallId
      ? await resolveCardById(db, body.scryfallId)
      : await resolveCardByName(db, body.name);
    if (!card) throw new DomainError('not_found', 'Carta não encontrada no Scryfall');
    await addCollectionCard(db, {
      userId: user.id,
      card,
      quantity: body.quantity,
      foil: body.foil,
    });
    return { added: true, name: card.name };
  },
  { status: 201 },
);
