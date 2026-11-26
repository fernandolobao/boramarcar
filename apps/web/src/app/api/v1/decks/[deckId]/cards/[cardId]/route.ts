import { setDeckCardProxy } from '@boramarcar/db';
import { z } from 'zod';
import { track } from '@/server/activity';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ isProxy: z.boolean() });

export const PATCH = authed<{ deckId: string; cardId: string }>(
  async ({ req, db, user, params }) => {
    const { isProxy } = await parseJson(req, schema);
    const card = await setDeckCardProxy(db, {
      deckId: params.deckId,
      deckCardId: params.cardId,
      userId: user.id,
      isProxy,
    });
    track({ userId: user.id, kind: 'deck_updated', targetId: params.deckId });
    return { card };
  },
);
