import { DECK_BOARDS, MAX_COPIES } from '@boramarcar/core';
import { setDeckLine } from '@boramarcar/db';
import { z } from 'zod';
import { resolveCardByName } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  board: z.enum(DECK_BOARDS),
  quantity: z.number().int().min(0).max(MAX_COPIES),
  proxies: z.number().int().min(0).max(MAX_COPIES),
});

/**
 * Define a quantidade (e quantas são proxy) de uma carta num board. Quantidade 0 remove.
 * Cartas novas são buscadas no Scryfall pelo nome; se não existirem, a resposta avisa.
 */
export const PUT = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  const card = body.quantity > 0 ? await resolveCardByName(db, body.name) : null;
  const line = await setDeckLine(db, { ...body, card, deckId: params.deckId, userId: user.id });
  return { line, found: body.quantity === 0 || card !== null };
});
