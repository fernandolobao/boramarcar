import { GAME_FORMATS } from '@boramarcar/core';
import { deleteDeck, getDeck, updateDeck } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

export const GET = authed<{ deckId: string }>(async ({ db, user, params }) => ({
  deck: await getDeck(db, { deckId: params.deckId, viewerId: user.id }),
}));

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    format: z.enum(GAME_FORMATS).optional(),
  })
  .strict();

/** Renomeia o deck ou muda o tipo de jogo (dono). */
export const PATCH = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, patchSchema);
  return { deck: await updateDeck(db, { ...body, deckId: params.deckId, userId: user.id }) };
});

export const DELETE = authed<{ deckId: string }>(async ({ db, user, params }) => {
  await deleteDeck(db, { deckId: params.deckId, userId: user.id });
});
