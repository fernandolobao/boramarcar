import { betaState, type BetaState } from '@boramarcar/core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  max,
  ne,
  notInArray,
} from 'drizzle-orm';
import type { Database } from '../client';
import type { OnboardingFlag } from './onboarding';
import {
  betaGroups,
  betaProgram,
  events,
  games,
  groupMembers,
  groups,
  onboardingSteps,
} from '../schema';

/**
 * Beta assistido (8.5). Quem administra escolhe os grupos e uma data única de início; antes dela
 * nada muda para os grupos. Depois, o painel mostra a faixa "Você está no beta" (semana N de 8) e
 * o cron manda o e-mail de boas-vindas uma vez por grupo.
 */
const PROGRAM_ID = 'beta';
export const BETA_BANNER_FLAG = 'beta-banner-dismissed' satisfies OnboardingFlag;

async function program(db: Database) {
  const [row] = await db.select().from(betaProgram).where(eq(betaProgram.id, PROGRAM_ID));
  return row ?? null;
}

/** Estado do beta (fase, datas, semana) e os grupos escolhidos. */
export async function getBeta(db: Database, now = new Date()) {
  const [row, rows] = await Promise.all([
    program(db),
    db.select({ groupId: betaGroups.groupId }).from(betaGroups),
  ]);
  return {
    state: betaState({ startsAt: row?.startsAt ?? null, endedAt: row?.endedAt ?? null }, now),
    groupIds: rows.map((r) => r.groupId),
  };
}

/** Grupos para escolher no /admin (com o número de pessoas), os do beta primeiro. */
export async function listGroupsForBeta(db: Database) {
  const rows = await db
    .select({ id: groups.id, name: groups.name, members: count(groupMembers.userId) })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .groupBy(groups.id)
    .orderBy(desc(count(groupMembers.userId)), asc(groups.name))
    .limit(200);
  const chosen = new Set((await db.select().from(betaGroups)).map((r) => r.groupId));
  return rows
    .map((r) => ({ ...r, members: Number(r.members), inBeta: chosen.has(r.id) }))
    .sort((a, b) => Number(b.inBeta) - Number(a.inBeta));
}

/**
 * Salva os grupos e a data de início (`null` = sem data). Mudar a data reabre um beta encerrado.
 * Grupos que saem perdem a marca de boas-vindas; os que ficam mantêm.
 */
export async function saveBeta(db: Database, input: { groupIds: string[]; startsAt: Date | null }) {
  const wanted = [...new Set(input.groupIds)];
  const existing = wanted.length
    ? (await db.select({ id: groups.id }).from(groups).where(inArray(groups.id, wanted))).map(
        (r) => r.id,
      )
    : [];
  await db.transaction(async (tx) => {
    await tx
      .insert(betaProgram)
      .values({ id: PROGRAM_ID, startsAt: input.startsAt, endedAt: null })
      .onConflictDoUpdate({
        target: betaProgram.id,
        set: { startsAt: input.startsAt, endedAt: null },
      });
    await tx
      .delete(betaGroups)
      .where(existing.length ? notInArray(betaGroups.groupId, existing) : undefined);
    if (existing.length) {
      await tx
        .insert(betaGroups)
        .values(existing.map((groupId) => ({ groupId })))
        .onConflictDoNothing();
    }
  });
  return getBeta(db);
}

/** Encerra o beta agora (antes das 8 semanas). */
export async function endBeta(db: Database, now = new Date()) {
  await db.update(betaProgram).set({ endedAt: now }).where(eq(betaProgram.id, PROGRAM_ID));
  return getBeta(db, now);
}

/** Faixa do painel: semana do beta, se o grupo está nele, o beta está rodando e a pessoa não dispensou. */
export async function getBetaBanner(
  db: Database,
  input: { groupId: string; userId: string; now?: Date },
): Promise<{ week: number; endsAt: Date } | null> {
  const now = input.now ?? new Date();
  const [row, member, dismissed] = await Promise.all([
    program(db),
    db.select().from(betaGroups).where(eq(betaGroups.groupId, input.groupId)),
    db
      .select()
      .from(onboardingSteps)
      .where(
        and(eq(onboardingSteps.userId, input.userId), eq(onboardingSteps.step, BETA_BANNER_FLAG)),
      ),
  ]);
  if (!row || member.length === 0 || dismissed.length > 0) return null;
  const state = betaState(row, now);
  return state.phase === 'running' ? { week: state.week!, endsAt: state.endsAt! } : null;
}

/**
 * Marca como recebidos os grupos do beta que ainda não ganharam o e-mail de boas-vindas e os
 * devolve (só com o beta rodando). A marcação vem antes do envio: duas execuções não duplicam.
 */
export async function claimBetaWelcomes(db: Database, now = new Date()) {
  const row = await program(db);
  if (!row || betaState(row, now).phase !== 'running') return [];
  const claimed = await db
    .update(betaGroups)
    .set({ welcomedAt: now })
    .where(isNull(betaGroups.welcomedAt))
    .returning({ groupId: betaGroups.groupId });
  if (claimed.length === 0) return [];
  return db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(
      inArray(
        groups.id,
        claimed.map((c) => c.groupId),
      ),
    );
}

/** Números por grupo do beta desde o início: pessoas, encontros que aconteceram e partidas. */
export async function getBetaGroupStats(db: Database, state: BetaState, now = new Date()) {
  const chosen = await db
    .select({ id: groups.id, name: groups.name, welcomedAt: betaGroups.welcomedAt })
    .from(betaGroups)
    .innerJoin(groups, eq(groups.id, betaGroups.groupId))
    .orderBy(asc(groups.name));
  if (chosen.length === 0) return [];
  const ids = chosen.map((g) => g.id);
  const from = state.startsAt ?? now;
  const to = state.endsAt && state.endsAt < now ? state.endsAt : now;
  const [members, held, played] = await Promise.all([
    db
      .select({ groupId: groupMembers.groupId, n: count() })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, ids))
      .groupBy(groupMembers.groupId),
    db
      .select({ groupId: events.groupId, n: count() })
      .from(events)
      .where(
        and(
          inArray(events.groupId, ids),
          ne(events.status, 'cancelled'),
          gte(events.startsAt, from),
          lt(events.startsAt, to),
        ),
      )
      .groupBy(events.groupId),
    db
      .select({ groupId: games.groupId, n: count(), last: max(games.playedAt) })
      .from(games)
      .where(and(inArray(games.groupId, ids), gte(games.playedAt, from), lt(games.playedAt, to)))
      .groupBy(games.groupId),
  ]);
  const byGroup = <T extends { groupId: string }>(rows: T[]) =>
    new Map(rows.map((r) => [r.groupId, r]));
  const m = byGroup(members);
  const h = byGroup(held);
  const p = byGroup(played);
  return chosen.map((g) => ({
    id: g.id,
    name: g.name,
    welcomed: g.welcomedAt !== null,
    members: Number(m.get(g.id)?.n ?? 0),
    eventsHeld: Number(h.get(g.id)?.n ?? 0),
    games: Number(p.get(g.id)?.n ?? 0),
    lastGameAt: p.get(g.id)?.last ?? null,
  }));
}
