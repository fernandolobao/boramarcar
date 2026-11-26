import { ACTIVITY_RETENTION_DAYS, activityBucket, type ActivityKind } from '@boramarcar/core';
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../client';
import { activityLog, decks, groups, user } from '../schema';

/**
 * Registro de atividade (Admin): soma a ação na linha da hora (pessoa × ação × alvo × hora).
 * Um comando só (INSERT … ON CONFLICT), chamado depois da resposta: não atrasa quem usa.
 */
export async function recordActivity(
  db: Database,
  input: {
    userId: string;
    kind: ActivityKind;
    groupId?: string | null;
    targetId?: string | null;
    label?: string | null;
    count?: number;
    at?: Date;
  },
) {
  const at = input.at ?? new Date();
  const count = Math.max(1, Math.round(input.count ?? 1));
  await db
    .insert(activityLog)
    .values({
      userId: input.userId,
      groupId: input.groupId ?? null,
      kind: input.kind,
      targetId: input.targetId ?? '',
      label: input.label?.slice(0, 120) ?? null,
      count,
      bucket: activityBucket(at),
      firstAt: at,
      lastAt: at,
    })
    .onConflictDoUpdate({
      target: [activityLog.userId, activityLog.kind, activityLog.targetId, activityLog.bucket],
      set: {
        count: sql`${activityLog.count} + ${count}`,
        lastAt: sql`greatest(${activityLog.lastAt}, excluded.last_at)`,
        firstAt: sql`least(${activityLog.firstAt}, excluded.first_at)`,
        label: sql`coalesce(excluded.label, ${activityLog.label})`,
        groupId: sql`coalesce(excluded.group_id, ${activityLog.groupId})`,
      },
    });
}

/** Lista para o Admin, mais recente primeiro, com filtros e paginação. */
export async function listActivity(
  db: Database,
  input: {
    since: Date;
    kind?: ActivityKind;
    groupId?: string;
    userId?: string;
    /** Nome ou e-mail da pessoa. */
    query?: string;
    limit?: number;
    offset?: number;
  },
) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const filters: SQL[] = [gte(activityLog.lastAt, input.since)];
  if (input.kind) filters.push(eq(activityLog.kind, input.kind));
  if (input.groupId) filters.push(eq(activityLog.groupId, input.groupId));
  if (input.userId) filters.push(eq(activityLog.userId, input.userId));
  const q = input.query?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    filters.push(or(ilike(user.name, like), ilike(user.email, like))!);
  }
  const rows = await db
    .select({
      id: activityLog.id,
      userId: activityLog.userId,
      userName: user.name,
      userEmail: user.email,
      groupId: activityLog.groupId,
      groupName: groups.name,
      kind: activityLog.kind,
      targetId: activityLog.targetId,
      label: activityLog.label,
      count: activityLog.count,
      bucket: activityLog.bucket,
      firstAt: activityLog.firstAt,
      lastAt: activityLog.lastAt,
    })
    .from(activityLog)
    .innerJoin(user, eq(user.id, activityLog.userId))
    .leftJoin(groups, eq(groups.id, activityLog.groupId))
    .where(and(...filters))
    .orderBy(desc(activityLog.lastAt), desc(activityLog.id))
    .limit(limit + 1)
    .offset(offset);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Limpeza (cron diário): sai o que passou de 90 dias. Devolve quantas linhas saíram. */
export async function purgeActivity(db: Database, now = new Date()) {
  const before = new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * 86_400_000);
  const removed = await db
    .delete(activityLog)
    .where(lt(activityLog.bucket, before))
    .returning({ id: activityLog.id });
  return removed.length;
}

/** Nome do deck (para a frase do registro); `null` se o deck não existe mais. */
export async function getDeckName(db: Database, deckId: string) {
  const [row] = await db
    .select({ name: decks.name })
    .from(decks)
    .where(eq(decks.id, deckId))
    .limit(1);
  return row?.name ?? null;
}
