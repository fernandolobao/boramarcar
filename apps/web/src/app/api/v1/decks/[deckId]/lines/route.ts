import { DECK_BOARDS, MAX_COPIES } from '@boramarcar/core';
import { addDeckCopies, setDeckLine } from '@boramarcar/db';
import { z } from 'zod';
import { resolveCardById, resolveCardByName, resolveDefaultCardByName } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  board: z.enum(DECK_BOARDS),
  quantity: z.number().int().min(0).max(MAX_COPIES),
  proxies: z.number().int().min(0).max(MAX_COPIES),
  /** Edição da linha (a mesma carta pode estar em várias edições). */
  scryfallId: z.string().min(1).max(64).nullable().optional(),
  /** Quantas cópias reais são foil; sem valor, mantém as que já eram. */
  foils: z.number().int().min(0).max(MAX_COPIES).optional(),
  /** Atalho: todas as cópias reais foil ou nenhuma (apps antigos). */
  foil: z.boolean().optional(),
});

/**
 * Define a quantidade (e quantas são proxy e quantas são foil) de uma carta num board. Quantidade 0 remove.
 * Cartas novas são buscadas no Scryfall pelo nome; se não existirem, a resposta avisa.
 */
export const PUT = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  const card =
    body.quantity === 0
      ? null
      : body.scryfallId
        ? await resolveCardById(db, body.scryfallId)
        : await resolveCardByName(db, body.name);
  const line = await setDeckLine(db, { ...body, card, deckId: params.deckId, userId: user.id });
  return { line, found: body.quantity === 0 || card !== null };
});

const addSchema = z.object({
  name: z.string().trim().min(1).max(200),
  board: z.enum(DECK_BOARDS),
  quantity: z.number().int().min(1).max(MAX_COPIES),
  proxies: z.number().int().min(0).max(MAX_COPIES),
});

/**
 * Adiciona cópias de uma carta pelo nome ("Adicionar carta"): entram na impressão padrão do
 * Scryfall e só somam com a linha dessa mesma impressão — nunca com uma edição escolhida para
 * outras cópias, que assim continuam separadas e editáveis.
 */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, addSchema);
  await rateLimit(db, user.id, 'search');
  const card = await resolveDefaultCardByName(db, body.name);
  const line = await addDeckCopies(db, { ...body, card, deckId: params.deckId, userId: user.id });
  return { line, found: card !== null };
});
