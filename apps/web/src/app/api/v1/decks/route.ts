import { DomainError, formatRules, GAME_FORMATS } from '@boramarcar/core';
import { createDeck, getDeckCovers, getDeckRatings, listDecks } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { importDeck, resolveCardByName } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';
import { track } from '@/server/activity';

export const GET = authed(async ({ db, user }) => {
  const decks = await listDecks(db, user.id);
  const ids = decks.map((d) => d.id);
  // Os decks são da própria pessoa: capa sem filtro de visibilidade.
  const [ratings, covers] = await Promise.all([getDeckRatings(db, ids), getDeckCovers(db, ids)]);
  return {
    decks: decks.map((d) => {
      const cover = covers.get(d.id);
      return {
        ...d,
        score: ratings.get(d.id)?.score ?? null,
        bracket: ratings.get(d.id)?.bracket ?? null,
        /** Capa (como no site): arte recortada, nome do(s) comandante(s) — ou da carta de capa — e cores. */
        cover: cover
          ? {
              artUri: cover.artUri,
              names: cover.cards.map((c) => c.name),
              colorIdentity: cover.colorIdentity,
            }
          : null,
      };
    }),
  };
});

const createSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('url'),
    url: z.url(),
    name: z.string().trim().max(120).optional(),
    format: z.enum(GAME_FORMATS).optional(),
    /** Rascunho (11.2): as cartas não entram na coleção até publicar. */
    draft: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal('text'),
    name: z.string().trim().max(120).optional(),
    text: z.string().min(1).max(50_000),
    format: z.enum(GAME_FORMATS).optional(),
    draft: z.boolean().default(false),
  }),
  // Do zero (11.1): nome, formato e, se quiser, o comandante pelo nome.
  z.object({
    kind: z.literal('empty'),
    name: z.string().trim().min(1).max(120),
    format: z.enum(GAME_FORMATS),
    commander: z.string().trim().min(1).max(200).optional(),
    draft: z.boolean().default(true),
  }),
]);

export const POST = authed(
  async ({ req, db, user }) => {
    const body = await parseJson(req, createSchema);
    if (body.kind === 'empty') {
      if (body.commander && !formatRules(body.format).usesCommander) {
        throw new DomainError('invalid_input', 'Este formato não tem comandante');
      }
      const commander = body.commander
        ? await rateLimit(db, user.id, 'search').then(() => resolveCardByName(db, body.commander!))
        : null;
      if (body.commander && !commander) {
        throw new DomainError('not_found', 'Comandante não encontrado no Scryfall');
      }
      const deck = await createDeck(db, {
        ownerId: user.id,
        name: body.name,
        format: body.format,
        commander,
        draft: body.draft,
      });
      track({ userId: user.id, kind: 'deck_created', targetId: deck.id, label: deck.name });
      return { deck, notFound: [] };
    }
    const { format, draft, ...input } = body;
    await rateLimit(db, user.id, 'import');
    const result = await importDeck(db, user.id, input, fetch, format, { draft });
    // Tagger e Spellbook em segundo plano: a importação não espera por eles.
    runAfterResponse(() => refreshDeckAnalysis(db, { deckId: result.deck.id, viewerId: user.id }));
    track({ userId: user.id, kind: 'deck_imported', targetId: result.deck.id });
    return result;
  },
  { status: 201 },
);
