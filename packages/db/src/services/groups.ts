import { DomainError, validateGroupSettings, type GroupSettings } from '@boramarcar/core';
import { and, asc, count, eq } from 'drizzle-orm';
import type { Database } from '../client';
import {
  availabilityRules,
  availabilitySlots,
  groupMembers,
  groups,
  locations,
  user,
} from '../schema';

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
      tableSize: groups.tableSize,
      minDurationMinutes: groups.minDurationMinutes,
      pointsWin: groups.pointsWin,
      pointsDraw: groups.pointsDraw,
      pointsLoss: groups.pointsLoss,
      defaultFormat: groups.defaultFormat,
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

/* ---------- Gestão de membros ---------- */

async function getRole(db: Database, groupId: string, userId: string) {
  const [row] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

/**
 * Promove um membro a admin ou rebaixa um admin a membro.
 * Regras: dono e admins promovem membros; só o dono rebaixa admins; ninguém muda o dono.
 */
export async function setMemberRole(
  db: Database,
  input: { groupId: string; actorId: string; targetUserId: string; role: 'admin' | 'member' },
) {
  const actor = await requireMembership(db, input.groupId, input.actorId);
  const targetRole = await getRole(db, input.groupId, input.targetUserId);
  if (!targetRole) throw new DomainError('not_found', 'Membro não encontrado');
  if (targetRole === 'owner')
    throw new DomainError('forbidden', 'Para mudar o dono, transfira a posse do grupo');
  if (actor.role === 'member')
    throw new DomainError('forbidden', 'Só o dono ou um admin pode mudar papéis');
  if (targetRole === 'admin' && input.role === 'member' && actor.role !== 'owner') {
    throw new DomainError('forbidden', 'Só o dono pode rebaixar um admin');
  }
  await db
    .update(groupMembers)
    .set({ role: input.role })
    .where(
      and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)),
    );
}

/** Tira a pessoa do grupo e apaga as disponibilidades dela no grupo (o histórico de partidas fica). */
async function removeMembership(db: Database, groupId: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .delete(availabilitySlots)
      .where(and(eq(availabilitySlots.groupId, groupId), eq(availabilitySlots.userId, userId)));
    await tx
      .delete(availabilityRules)
      .where(and(eq(availabilityRules.groupId, groupId), eq(availabilityRules.userId, userId)));
    await tx
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  });
}

/**
 * Remove um membro. Dono remove qualquer um; admin remove apenas membros comuns.
 * Para sair do próprio grupo use `leaveGroup`.
 */
export async function removeMember(
  db: Database,
  input: { groupId: string; actorId: string; targetUserId: string },
) {
  if (input.actorId === input.targetUserId)
    return leaveGroup(db, { groupId: input.groupId, userId: input.actorId });
  const actor = await requireMembership(db, input.groupId, input.actorId);
  const targetRole = await getRole(db, input.groupId, input.targetUserId);
  if (!targetRole) throw new DomainError('not_found', 'Membro não encontrado');
  const allowed = actor.role === 'owner' || (actor.role === 'admin' && targetRole === 'member');
  if (!allowed) throw new DomainError('forbidden', 'Você não pode remover esta pessoa');
  await removeMembership(db, input.groupId, input.targetUserId);
  return { groupDeleted: false };
}

/**
 * Sai do grupo. O dono precisa transferir a posse antes, a menos que seja o último membro —
 * nesse caso o grupo é apagado.
 */
export async function leaveGroup(db: Database, input: { groupId: string; userId: string }) {
  const membership = await requireMembership(db, input.groupId, input.userId);
  const [{ value: memberCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, input.groupId));
  if (membership.role === 'owner') {
    if (memberCount > 1) {
      throw new DomainError('conflict', 'Transfira a posse do grupo antes de sair');
    }
    await db.delete(groups).where(eq(groups.id, input.groupId));
    return { groupDeleted: true };
  }
  await removeMembership(db, input.groupId, input.userId);
  return { groupDeleted: false };
}

/** Passa a posse do grupo para outro membro; o dono anterior vira admin. */
export async function transferOwnership(
  db: Database,
  input: { groupId: string; ownerId: string; newOwnerId: string },
) {
  const actor = await requireMembership(db, input.groupId, input.ownerId);
  if (actor.role !== 'owner')
    throw new DomainError('forbidden', 'Só o dono pode transferir a posse');
  if (input.newOwnerId === input.ownerId)
    throw new DomainError('invalid_input', 'Escolha outro membro');
  const targetRole = await getRole(db, input.groupId, input.newOwnerId);
  if (!targetRole) throw new DomainError('not_found', 'Membro não encontrado');
  await db.transaction(async (tx) => {
    await tx
      .update(groupMembers)
      .set({ role: 'admin' })
      .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.ownerId)));
    await tx
      .update(groupMembers)
      .set({ role: 'owner' })
      .where(
        and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId)),
      );
  });
}

const settingsOf = (group: typeof groups.$inferSelect): GroupSettings => ({
  tableSize: group.tableSize,
  minDurationMinutes: group.minDurationMinutes,
  pointsWin: group.pointsWin,
  pointsDraw: group.pointsDraw,
  pointsLoss: group.pointsLoss,
  defaultFormat: group.defaultFormat as GroupSettings['defaultFormat'],
});

/** Configurações do grupo (mesa, duração mínima, pontos e tipo de jogo padrão). */
export async function getGroupSettings(db: Database, input: { groupId: string; userId: string }) {
  return settingsOf(await requireMembership(db, input.groupId, input.userId));
}

/** Altera as configurações (dono/admin). Campos omitidos mantêm o valor atual. */
export async function updateGroupSettings(
  db: Database,
  input: { groupId: string; userId: string } & Partial<GroupSettings>,
) {
  const group = await requireMembership(db, input.groupId, input.userId);
  if (group.role === 'member') {
    throw new DomainError('forbidden', 'Só o dono ou um admin pode alterar as configurações');
  }
  const { groupId: _g, userId: _u, ...changes } = input;
  const next = validateGroupSettings({
    ...settingsOf(group),
    ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
  });
  await db.update(groups).set(next).where(eq(groups.id, input.groupId));
  return next;
}
