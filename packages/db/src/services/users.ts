import { assertTimeZone, DEFAULT_TIME_ZONE, DomainError } from '@boramarcar/core';
import { asc, count, eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { decks, gamePlayers, groupMembers, groups, user } from '../schema';

export async function getUserPreferences(db: Database, userId: string) {
  const [row] = await db
    .select({
      timeZone: user.timeZone,
      locale: user.locale,
      emailNotifications: user.emailNotifications,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Usuário não encontrado');
  return {
    timeZone: row.timeZone ?? DEFAULT_TIME_ZONE,
    timeZoneIsDefault: !row.timeZone,
    locale: row.locale,
    emailNotifications: row.emailNotifications,
  };
}

export async function updateUserPreferences(
  db: Database,
  input: { userId: string; timeZone?: string; locale?: string; emailNotifications?: boolean },
) {
  const changes: Partial<typeof user.$inferInsert> = {};
  if (input.timeZone !== undefined) {
    assertTimeZone(input.timeZone);
    changes.timeZone = input.timeZone;
  }
  if (input.locale !== undefined) changes.locale = input.locale;
  if (input.emailNotifications !== undefined) changes.emailNotifications = input.emailNotifications;
  if (Object.keys(changes).length === 0)
    throw new DomainError('invalid_input', 'Nada para atualizar');
  const [row] = await db
    .update(user)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(user.id, input.userId))
    .returning({
      timeZone: user.timeZone,
      locale: user.locale,
      emailNotifications: user.emailNotifications,
    });
  if (!row) throw new DomainError('not_found', 'Usuário não encontrado');
  return row;
}

/** Resumo do perfil: desde quando usa o app, grupos, partidas, vitórias e decks (em todos os grupos). */
export async function getUserSummary(db: Database, userId: string) {
  const [row] = await db
    .select({ createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Usuário não encontrado');
  const [[games], [deckCount], userGroups] = await Promise.all([
    db
      .select({
        games: count(),
        wins: sql<number>`count(*) filter (where ${gamePlayers.result} = 'win')`.mapWith(Number),
      })
      .from(gamePlayers)
      .where(eq(gamePlayers.userId, userId)),
    db.select({ value: count() }).from(decks).where(eq(decks.ownerId, userId)),
    db
      .select({ id: groups.id, name: groups.name, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .orderBy(asc(groups.name)),
  ]);
  const played = games?.games ?? 0;
  const wins = games?.wins ?? 0;
  return {
    memberSince: row.createdAt,
    games: played,
    wins,
    winRate: played ? wins / played : 0,
    decks: deckCount?.value ?? 0,
    groups: userGroups,
  };
}

/**
 * Foto de perfil vinda do provedor de login (ex.: claim `picture` do Google). Só grava quando a URL
 * muda: a URL da foto pode trocar a qualquer momento e não identifica o usuário. Quem chama já
 * validou a URL; para limpar a foto, este não é o caminho (nunca grava vazio).
 */
export async function updateUserImage(db: Database, input: { userId: string; image: string }) {
  if (!input.image.trim()) return false;
  const updated = await db
    .update(user)
    .set({ image: input.image, updatedAt: new Date() })
    .where(sql`${user.id} = ${input.userId} and ${user.image} is distinct from ${input.image}`)
    .returning({ id: user.id });
  return updated.length > 0;
}

/** Foto atual do usuário (ou `null`). */
export async function getUserImage(db: Database, userId: string) {
  const [row] = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.image ?? null;
}
