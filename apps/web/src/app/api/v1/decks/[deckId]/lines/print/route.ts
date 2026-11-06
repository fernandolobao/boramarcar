import { DECK_BOARDS, MAX_COPIES } from '@boramarcar/core';
import { z } from 'zod';
import { changeLinePrint } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  board: z.enum(DECK_BOARDS),
  fromScryfallId: z.string().min(1).max(64).nullable(),
  toScryfallId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_COPIES),
});

/** Troca a edição de cópias de uma carta (reais primeiro, depois proxies). */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  return changeLinePrint(db, { ...body, deckId: params.deckId, userId: user.id });
});
