import { DomainError } from '@boramarcar/core';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { Database } from '../client';
import { storeFollowers, storeMembers, storeNotices, stores } from '../schema';
import { addNotifications } from './inbox';
import { requireStoreRole } from './stores';

/** Tamanho máximo do aviso (cabe inteiro numa notificação). */
export const STORE_NOTICE_MAX = 280;
/** Avisos por loja a cada 7 dias (para não virar spam). */
export const STORE_NOTICES_PER_WEEK = 3;
const WEEK = 7 * 86_400_000;

async function requireStore(db: Database, storeId: string) {
  const [row] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId));
  if (!row) throw new DomainError('not_found', 'Loja não encontrada');
}

/** Nome e endereço da loja (para o push); `null` se não existe. */
export async function getStoreBrief(db: Database, storeId: string) {
  const [row] = await db
    .select({ name: stores.name, slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, storeId));
  return row ?? null;
}

/** Segue a loja (repetir não duplica). */
export async function followStore(db: Database, input: { storeId: string; userId: string }) {
  await requireStore(db, input.storeId);
  await db
    .insert(storeFollowers)
    .values({ storeId: input.storeId, userId: input.userId })
    .onConflictDoNothing();
}

/** Deixa de seguir a loja. */
export async function unfollowStore(db: Database, input: { storeId: string; userId: string }) {
  await db
    .delete(storeFollowers)
    .where(and(eq(storeFollowers.storeId, input.storeId), eq(storeFollowers.userId, input.userId)));
}

export async function isFollowingStore(db: Database, input: { storeId: string; userId: string }) {
  const [row] = await db
    .select({ storeId: storeFollowers.storeId })
    .from(storeFollowers)
    .where(and(eq(storeFollowers.storeId, input.storeId), eq(storeFollowers.userId, input.userId)))
    .limit(1);
  return Boolean(row);
}

/** Quantas pessoas seguem (só a equipe vê; nunca quem). */
export async function getStoreFollowerCount(
  db: Database,
  input: { storeId: string; userId: string },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner', 'staff']);
  const [row] = await db
    .select({ n: count() })
    .from(storeFollowers)
    .where(eq(storeFollowers.storeId, input.storeId));
  return Number(row?.n ?? 0);
}

/** Quem segue a loja, sem a equipe dela (que não recebe o próprio aviso). Para sino e push. */
export async function listStoreFollowerIds(db: Database, storeId: string) {
  const [followers, team] = await Promise.all([
    db
      .select({ userId: storeFollowers.userId })
      .from(storeFollowers)
      .where(eq(storeFollowers.storeId, storeId)),
    db
      .select({ userId: storeMembers.userId })
      .from(storeMembers)
      .where(eq(storeMembers.storeId, storeId)),
  ]);
  const staff = new Set(team.map((m) => m.userId));
  return followers.map((f) => f.userId).filter((id) => !staff.has(id));
}

/** Avisa no sino quem segue a loja que ela marcou um evento novo. */
export async function notifyFollowersOfEvent(
  db: Database,
  input: { storeId: string; storeEventId: string },
) {
  const followers = await listStoreFollowerIds(db, input.storeId);
  await addNotifications(
    db,
    followers.map((userId) => ({
      userId,
      groupId: null,
      data: {
        kind: 'store_event' as const,
        storeEventId: input.storeEventId,
        event: 'new' as const,
      },
    })),
  );
  return followers;
}

/**
 * Aviso da equipe para quem segue (até 280 caracteres, 3 por semana por loja). Vai para o sino;
 * devolve quem recebeu (para o push).
 */
export async function postStoreNotice(
  db: Database,
  input: { storeId: string; userId: string; text: string; now?: Date },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner', 'staff']);
  const text = input.text.trim();
  if (!text || text.length > STORE_NOTICE_MAX) {
    throw new DomainError(
      'invalid_input',
      `O aviso precisa ter de 1 a ${STORE_NOTICE_MAX} caracteres`,
    );
  }
  const now = input.now ?? new Date();
  const [recent] = await db
    .select({ n: count() })
    .from(storeNotices)
    .where(
      and(
        eq(storeNotices.storeId, input.storeId),
        gte(storeNotices.createdAt, new Date(now.getTime() - WEEK)),
      ),
    );
  if (Number(recent?.n ?? 0) >= STORE_NOTICES_PER_WEEK) {
    throw new DomainError(
      'rate_limited',
      `Limite de ${STORE_NOTICES_PER_WEEK} avisos por semana para quem segue a loja`,
    );
  }
  const [notice] = await db
    .insert(storeNotices)
    .values({ storeId: input.storeId, text, createdBy: input.userId, createdAt: now })
    .returning();
  const followers = await listStoreFollowerIds(db, input.storeId);
  await addNotifications(
    db,
    followers.map((userId) => ({
      userId,
      groupId: null,
      data: { kind: 'store_notice' as const, storeId: input.storeId, noticeId: notice!.id },
    })),
  );
  return { notice: notice!, followers };
}

/** Últimos avisos da loja (para a equipe, em "Gerenciar a loja"). */
export async function listStoreNotices(db: Database, input: { storeId: string; userId: string }) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner', 'staff']);
  return db
    .select({ id: storeNotices.id, text: storeNotices.text, createdAt: storeNotices.createdAt })
    .from(storeNotices)
    .where(eq(storeNotices.storeId, input.storeId))
    .orderBy(desc(storeNotices.createdAt))
    .limit(10);
}
