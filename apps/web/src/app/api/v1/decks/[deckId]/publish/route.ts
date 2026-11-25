import { DECK_BOARDS } from '@boramarcar/core';
import { publishDeck } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  /** Por carta com cópias livres na coleção: usar uma delas (`use`) ou entrar como nova (`null`). */
  choices: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        board: z.enum(DECK_BOARDS),
        fromScryfallId: z.string().max(64).nullable(),
        use: z.object({ scryfallId: z.string().max(64).nullable(), foil: z.boolean() }).nullable(),
      }),
    )
    .max(250)
    .default([]),
});

/** Publica o rascunho (11.2): o deck vira de verdade e as cartas entram na coleção. Só o dono. */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const hasBody = req.headers.get('content-type')?.includes('application/json');
  const { choices } = hasBody ? await parseJson(req, schema) : { choices: [] };
  return { deck: await publishDeck(db, { deckId: params.deckId, userId: user.id, choices }) };
});
