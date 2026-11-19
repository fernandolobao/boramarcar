import { DomainError, GAME_FORMATS } from '@boramarcar/core';
import { STORE_EVENT_KINDS } from '@boramarcar/core/stores';
import { getStoreEventPublic, getStoreEventTournament, updateStoreEvent } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  format: z.enum(GAME_FORMATS).optional(),
  kind: z.enum(STORE_EVENT_KINDS).optional(),
  capacity: z.number().int().min(1).max(512).nullable().optional(),
  prizes: z.string().max(2000).nullable().optional(),
  rules: z.string().max(2000).nullable().optional(),
});

/**
 * Evento de loja para o app: dados públicos, a inscrição de quem pede e o torneio (se começou).
 * Sem nomes de inscritos nem o código do balcão.
 */
export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => {
  const event = await getStoreEventPublic(db, { eventId: params.eventId, viewerId: user.id });
  if (!event) throw new DomainError('not_found', 'Evento não encontrado');
  const tournament = await getStoreEventTournament(db, {
    eventId: params.eventId,
    viewerId: user.id,
  });
  return { event, tournamentId: tournament?.tournament.id ?? null };
});

/** Edita o evento da loja (equipe). Mais vagas sobem a lista de espera. */
export const PATCH = authed<{ eventId: string }>(async ({ req, db, user, params }) => {
  await updateStoreEvent(db, {
    ...(await parseJson(req, schema)),
    eventId: params.eventId,
    userId: user.id,
  });
  return { saved: true };
});
