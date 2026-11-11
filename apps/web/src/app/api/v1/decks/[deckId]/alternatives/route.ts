import { CARD_ROLES } from '@boramarcar/core';
import { z } from 'zod';
import { findAlternatives } from '@/server/deck-analysis';
import { authed } from '@/server/http';
import { rateLimit } from '@/server/limits';

const schema = z.object({
  role: z.enum(CARD_ROLES),
  maxCmc: z.coerce.number().int().min(0).max(16).default(3),
});

/** Cartas alternativas para uma função do deck (4.6). */
export const GET = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const query = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
  await rateLimit(db, user.id, 'search');
  return findAlternatives(db, { deckId: params.deckId, viewerId: user.id, ...query });
});
