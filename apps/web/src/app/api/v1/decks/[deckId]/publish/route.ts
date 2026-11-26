import { DECK_BOARDS, DECK_VISIBILITIES } from '@boramarcar/core';
import { publishDeck } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';
import { track } from '@/server/activity';

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
  /** Quem vê o deck publicado (o rascunho é sempre privado); sem escolha, o grupo. */
  visibility: z.enum(DECK_VISIBILITIES).optional(),
});

/** Publica o rascunho (11.2): o deck vira de verdade e as cartas entram na coleção. Só o dono. */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const hasBody = req.headers.get('content-type')?.includes('application/json');
  const { choices, visibility } = hasBody
    ? await parseJson(req, schema)
    : { choices: [], visibility: undefined };
  const deck = await publishDeck(db, {
    deckId: params.deckId,
    userId: user.id,
    choices,
    visibility,
  });
  track({ userId: user.id, kind: 'deck_published', targetId: params.deckId });
  return { deck };
});
