import { DomainError } from '@boramarcar/core';
import { and, asc, count, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { groupMembers, groups, locations, user } from '../schema';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Gera um código de convite legível (sem 0/O/1/I). */
export function generateInviteCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('');
}

export type GroupRole = (typeof groupMembers.$inferSelect)['role'];

export async function createGroup(db: Database, input: { name: string; userId: string }) {
  const name = input.name.trim();
  if (name.length < 2) throw new DomainError('invalid_input', 'Nome do grupo muito curto');
  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({ name, inviteCode: generateInviteCode(), createdBy: input.userId })
      .returning();
    await tx
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: input.userId, role: 'owner' });
    return group!;
  });
}

export async function joinGroup(db: Database, input: { inviteCode: string; userId: string }) {
  const code = input.inviteCode.trim().toUpperCase();
  const [group] = await db.select().from(groups).where(eq(groups.inviteCode, code)).limit(1);
  if (!group) throw new DomainError('not_found', 'Convite inválido');
  await db
    .insert(groupMembers)
    .values({ groupId: group.id, userId: input.userId, role: 'member' })
    .onConflictDoNothing();
  return group;
}

export async function listGroupsForUser(db: Database, userId: string) {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groupMembers.joinedAt));
}

/** Garante que o usuário participa do grupo e retorna o grupo com o papel dele. */
export async function requireMembership(db: Database, groupId: string, userId: string) {
  const [row] = await db
    .select({ group: groups, role: groupMembers.role })
    .from(groups)
    .leftJoin(
      groupMembers,
      and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)),
    )
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Grupo não encontrado');
  if (!row.role) throw new DomainError('forbidden', 'Você não participa deste grupo');
  return { ...row.group, role: row.role };
}

export async function listMembers(db: Database, groupId: string) {
  return db
    .select({ userId: user.id, name: user.name, image: user.image, role: groupMembers.role })
    .from(groupMembers)
    .innerJoin(user, eq(user.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(user.name));
}

export async function createLocation(
  db: Database,
  input: {
    groupId: string;
    userId: string;
    name: string;
    address?: string | null;
    hostUserId?: string | null;
  },
) {
  await requireMembership(db, input.groupId, input.userId);
  const name = input.name.trim();
  if (!name) throw new DomainError('invalid_input', 'Informe o nome do local');
  const [location] = await db
    .insert(locations)
    .values({
      groupId: input.groupId,
      name,
      address: input.address?.trim() || null,
      hostUserId: input.hostUserId ?? null,
    })
    .returning();
  return location!;
}

export async function listLocations(db: Database, groupId: string) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.groupId, groupId))
    .orderBy(asc(locations.name));
}

/** Dados públicos de um convite (para a página /convite/:codigo, antes do login). */
export async function getInvitePreview(db: Database, inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  if (!code) return null;
  const [row] = await db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      members: count(groupMembers.userId),
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(eq(groups.inviteCode, code))
    .groupBy(groups.id)
    .limit(1);
  return row ?? null;
}

/** Diz se o usuário já participa do grupo (sem lançar erro). */
export async function isMember(db: Database, groupId: string, userId: string) {
  const [row] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** Gera um novo código de convite (o antigo deixa de funcionar). Só dono/admin. */
export async function regenerateInviteCode(
  db: Database,
  input: { groupId: string; userId: string },
) {
  const membership = await requireMembership(db, input.groupId, input.userId);
  if (membership.role === 'member') {
    throw new DomainError('forbidden', 'Só o dono ou um admin pode trocar o convite');
  }
  const [group] = await db
    .update(groups)
    .set({ inviteCode: generateInviteCode() })
    .where(eq(groups.id, input.groupId))
    .returning();
  return group!;
}
