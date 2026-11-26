import { DECK_VISIBILITIES, GAME_FORMATS } from '@boramarcar/core';
import { deleteDeck, getDeck, getDeckName, updateDeck } from '@boramarcar/db';
import { z } from 'zod';
import { isAdmin } from '@/server/admin';
import { authed, parseJson } from '@/server/http';
import { track } from '@/server/activity';

export const GET = authed<{ deckId: string }>(async ({ db, user, params }) => ({
  deck: await getDeck(db, {
    deckId: params.deckId,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  }),
}));

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    format: z.enum(GAME_FORMATS).optional(),
    visibility: z.enum(DECK_VISIBILITIES).optional(),
  })
  .strict();

/** Renomeia o deck ou muda o tipo de jogo (dono). */
export const PATCH = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, patchSchema);
  const deck = await updateDeck(db, { ...body, deckId: params.deckId, userId: user.id });
  track({ userId: user.id, kind: 'deck_updated', targetId: params.deckId, label: deck.name });
  return { deck };
});

export const DELETE = authed<{ deckId: string }>(async ({ db, user, params }) => {
  const label = await getDeckName(db, params.deckId);
  await deleteDeck(db, { deckId: params.deckId, userId: user.id });
  track({ userId: user.id, kind: 'deck_deleted', targetId: params.deckId, label });
});
