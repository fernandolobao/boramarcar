import {
  assertValidSlot,
  DomainError,
  findCommonWindows,
  type FindCommonWindowsOptions,
} from '@boramarcar/core';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { availabilitySlotLocations, availabilitySlots, user } from '../schema';
import { getGroupSettings, listLocations, listMembers, requireMembership } from './groups';
import { assertGroupLocations, loadRuleOccurrences } from './recurring';

export interface AddAvailabilityInput {
  groupId: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  locationIds?: string[];
  note?: string | null;
}

export async function addAvailability(db: Database, input: AddAvailabilityInput) {
  assertValidSlot({ start: input.startsAt, end: input.endsAt });
  await requireMembership(db, input.groupId, input.userId);
  const locationIds = [...new Set(input.locationIds ?? [])];

  await assertGroupLocations(db, input.groupId, locationIds);

  return db.transaction(async (tx) => {
    const [slot] = await tx
      .insert(availabilitySlots)
      .values({
        groupId: input.groupId,
        userId: input.userId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        note: input.note?.trim() || null,
      })
      .returning();
    if (locationIds.length) {
      await tx
        .insert(availabilitySlotLocations)
        .values(locationIds.map((locationId) => ({ slotId: slot!.id, locationId })));
    }
    return { ...slot!, locationIds };
  });
}

export async function listAvailability(
  db: Database,
  input: { groupId: string; userId: string; from: Date; to: Date },
) {
  await requireMembership(db, input.groupId, input.userId);
  const rows = await db
    .select({
      id: availabilitySlots.id,
      userId: availabilitySlots.userId,
      userName: user.name,
      startsAt: availabilitySlots.startsAt,
      endsAt: availabilitySlots.endsAt,
      note: availabilitySlots.note,
    })
    .from(availabilitySlots)
    .innerJoin(user, eq(user.id, availabilitySlots.userId))
    .where(
      and(
        eq(availabilitySlots.groupId, input.groupId),
        lt(availabilitySlots.startsAt, input.to),
        gt(availabilitySlots.endsAt, input.from),
      ),
    )
    .orderBy(asc(availabilitySlots.startsAt));

  const slotIds = rows.map((r) => r.id);
  const links = slotIds.length
    ? await db
        .select()
        .from(availabilitySlotLocations)
        .where(inArray(availabilitySlotLocations.slotId, slotIds))
    : [];
  const bySlot = new Map<string, string[]>();
  for (const link of links) {
    bySlot.set(link.slotId, [...(bySlot.get(link.slotId) ?? []), link.locationId]);
  }
  const oneOff = rows.map((row) => ({
    ...row,
    kind: 'once' as const,
    ruleId: null as string | null,
    date: null as string | null,
    locationIds: bySlot.get(row.id) ?? [],
  }));
  const weekly = (await loadRuleOccurrences(db, input)).map((o) => ({
    id: `${o.ruleId}:${o.date}`,
    userId: o.userId,
    userName: o.userName,
    startsAt: o.start,
    endsAt: o.end,
    note: o.note,
    kind: 'weekly' as const,
    ruleId: o.ruleId as string | null,
    date: o.date as string | null,
    locationIds: [...o.locationIds],
  }));
  return [...oneOff, ...weekly].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function deleteAvailability(db: Database, input: { slotId: string; userId: string }) {
  const [slot] = await db
    .select()
    .from(availabilitySlots)
    .where(eq(availabilitySlots.id, input.slotId))
    .limit(1);
  if (!slot) throw new DomainError('not_found', 'Disponibilidade não encontrada');
  if (slot.userId !== input.userId) {
    throw new DomainError('forbidden', 'Você só pode remover a sua disponibilidade');
  }
  await db.delete(availabilitySlots).where(eq(availabilitySlots.id, input.slotId));
}

/** Sugere janelas em que jogadores suficientes (padrão: mesa do grupo) podem jogar no mesmo local. */
export async function suggestGameWindows(
  db: Database,
  input: { groupId: string; userId: string; from: Date; to: Date } & Pick<
    FindCommonWindowsOptions,
    'minPlayers' | 'minDurationMinutes'
  >,
) {
  const [slots, groupLocations, members, settings] = await Promise.all([
    listAvailability(db, input),
    listLocations(db, input.groupId),
    listMembers(db, input.groupId),
    getGroupSettings(db, input),
  ]);
  const windows = findCommonWindows(
    slots.map((s) => ({
      userId: s.userId,
      start: s.startsAt,
      end: s.endsAt,
      locationIds: s.locationIds,
    })),
    {
      // Sem valores explícitos, vale a configuração do grupo (1.12).
      minPlayers: input.minPlayers ?? settings.tableSize,
      minDurationMinutes: input.minDurationMinutes ?? settings.minDurationMinutes,
      locationIds: groupLocations.map((l) => l.id),
    },
  );
  const names = new Map(members.map((m) => [m.userId, m.name]));
  const locationNames = new Map(groupLocations.map((l) => [l.id, l.name]));
  return windows.map((w) => ({
    ...w,
    players: w.userIds.map((id) => ({ userId: id, name: names.get(id) ?? id })),
    locationName: w.locationId ? (locationNames.get(w.locationId) ?? null) : null,
  }));
}
