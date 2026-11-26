import { DECK_BOARDS } from '@boramarcar/core';
import { moveDeckCard } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';
import { track } from '@/server/activity';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  from: z.enum(DECK_BOARDS),
  /** Board de destino; `null` remove a carta do board de origem. */
  to: z.enum(DECK_BOARDS).nullable(),
});

/**
 * Move todas as cópias de uma carta para outro board (ex.: fora da identidade de cor →
 * "talvez", 11.5) ou a remove. Só o dono.
 */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  const moved = await moveDeckCard(db, { ...body, deckId: params.deckId, userId: user.id });
  track({ userId: user.id, kind: 'deck_updated', targetId: params.deckId });
  return moved;
});
