import {
  assertLocalDate,
  assertValidSlot,
  assertWeeklyRule,
  DomainError,
  expandWeeklyRules,
  type WeeklyRule,
} from '@boramarcar/core';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import type { Database } from '../client';
import {
  availabilityRuleExceptions,
  availabilityRuleLocations,
  availabilityRules,
  availabilitySlotLocations,
  availabilitySlots,
  locations,
  user,
} from '../schema';
import { requireMembership } from './groups';

/** Garante que os locais existem e pertencem ao grupo. */
export async function assertGroupLocations(db: Database, groupId: string, locationIds: string[]) {
  if (!locationIds.length) return;
  const found = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.groupId, groupId), inArray(locations.id, locationIds)));
  if (found.length !== locationIds.length) {
    throw new DomainError('invalid_input', 'Local inválido para este grupo');
  }
}

export interface AddRuleInput {
  groupId: string;
  userId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  timeZone: string;
  locationIds?: string[];
  note?: string | null;
}

export async function addAvailabilityRule(db: Database, input: AddRuleInput) {
  assertWeeklyRule(input);
  await requireMembership(db, input.groupId, input.userId);
  const locationIds = [...new Set(input.locationIds ?? [])];
  await assertGroupLocations(db, input.groupId, locationIds);
  return db.transaction(async (tx) => {
    const [rule] = await tx
      .insert(availabilityRules)
      .values({
        groupId: input.groupId,
        userId: input.userId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        timeZone: input.timeZone,
        note: input.note?.trim() || null,
      })
      .returning();
    if (locationIds.length) {
      await tx
        .insert(availabilityRuleLocations)
        .values(locationIds.map((locationId) => ({ ruleId: rule!.id, locationId })));
    }
    return { ...rule!, locationIds, exceptions: [] as string[] };
  });
}

/** Regras do grupo com locais e exceções (para listar e expandir). */
export async function listAvailabilityRules(
  db: Database,
  input: { groupId: string; userId: string },
) {
  await requireMembership(db, input.groupId, input.userId);
  return loadRules(db, input.groupId);
}

async function loadRules(db: Database, groupId: string) {
  const rows = await db
    .select({ rule: availabilityRules, userName: user.name })
    .from(availabilityRules)
    .innerJoin(user, eq(user.id, availabilityRules.userId))
    .where(eq(availabilityRules.groupId, groupId))
    .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));
  const ids = rows.map((r) => r.rule.id);
  const [links, exceptions] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(availabilityRuleLocations)
          .where(inArray(availabilityRuleLocations.ruleId, ids)),
        db
          .select()
          .from(availabilityRuleExceptions)
          .where(inArray(availabilityRuleExceptions.ruleId, ids)),
      ])
    : [[], []];
  return rows.map(({ rule, userName }) => ({
    ...rule,
    userName,
    locationIds: links.filter((l) => l.ruleId === rule.id).map((l) => l.locationId),
    exceptions: exceptions
      .filter((e) => e.ruleId === rule.id)
      .map((e) => e.date)
      .sort(),
  }));
}

/** Ocorrências concretas das regras do grupo no intervalo, com o nome do jogador. */
export async function loadRuleOccurrences(
  db: Database,
  input: { groupId: string; from: Date; to: Date },
) {
  const rules = await loadRules(db, input.groupId);
  const names = new Map(rules.map((r) => [r.userId, r.userName]));
  const notes = new Map(rules.map((r) => [r.id, r.note]));
  return expandWeeklyRules(rules as WeeklyRule[], input.from, input.to).map((o) => ({
    ...o,
    userName: names.get(o.userId) ?? o.userId,
    note: notes.get(o.ruleId) ?? null,
  }));
}

async function requireOwnRule(db: Database, ruleId: string, userId: string) {
  const [rule] = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.id, ruleId))
    .limit(1);
  if (!rule) throw new DomainError('not_found', 'Regra não encontrada');
  if (rule.userId !== userId)
    throw new DomainError('forbidden', 'Você só pode alterar as suas regras');
  return rule;
}

export async function deleteAvailabilityRule(
  db: Database,
  input: { ruleId: string; userId: string },
) {
  await requireOwnRule(db, input.ruleId, input.userId);
  await db.delete(availabilityRules).where(eq(availabilityRules.id, input.ruleId));
}

/** Marca (ou desmarca) uma data em que a regra não vale. */
export async function setRuleException(
  db: Database,
  input: { ruleId: string; userId: string; date: string; skip: boolean },
) {
  assertLocalDate(input.date);
  const rule = await requireOwnRule(db, input.ruleId, input.userId);
  if (new Date(`${input.date}T12:00:00Z`).getUTCDay() !== rule.weekday) {
    throw new DomainError('invalid_input', 'A data não cai no dia da semana da regra');
  }
  if (input.skip) {
    await db
      .insert(availabilityRuleExceptions)
      .values({ ruleId: rule.id, date: input.date })
      .onConflictDoNothing();
  } else {
    await db
      .delete(availabilityRuleExceptions)
      .where(
        and(
          eq(availabilityRuleExceptions.ruleId, rule.id),
          eq(availabilityRuleExceptions.date, input.date),
        ),
      );
  }
}

/**
 * Marca ou desmarca um intervalo na grade semanal, ajustando as disponibilidades avulsas do
 * usuário: ao marcar, une com intervalos vizinhos sem local/observação; ao desmarcar, recorta.
 * Regras recorrentes não são alteradas aqui (use exceções).
 */
export async function setAvailabilityRange(
  db: Database,
  input: { groupId: string; userId: string; start: Date; end: Date; available: boolean },
) {
  assertValidSlot({ start: input.start, end: input.end });
  await requireMembership(db, input.groupId, input.userId);

  return db.transaction(async (tx) => {
    const own = await tx
      .select({ slot: availabilitySlots, locationId: availabilitySlotLocations.locationId })
      .from(availabilitySlots)
      .leftJoin(
        availabilitySlotLocations,
        eq(availabilitySlotLocations.slotId, availabilitySlots.id),
      )
      .where(
        and(
          eq(availabilitySlots.groupId, input.groupId),
          eq(availabilitySlots.userId, input.userId),
          // sobrepostos ou encostados
          lt(availabilitySlots.startsAt, new Date(input.end.getTime() + 1)),
          gt(availabilitySlots.endsAt, new Date(input.start.getTime() - 1)),
        ),
      );
    const slots = new Map<
      string,
      { slot: typeof availabilitySlots.$inferSelect; locationIds: string[] }
    >();
    for (const row of own) {
      const entry = slots.get(row.slot.id) ?? { slot: row.slot, locationIds: [] };
      if (row.locationId) entry.locationIds.push(row.locationId);
      slots.set(row.slot.id, entry);
    }

    if (input.available) {
      // Une com vizinhos "simples" (sem local e sem observação).
      let start = input.start;
      let end = input.end;
      const mergeable = [...slots.values()].filter((s) => !s.locationIds.length && !s.slot.note);
      for (const { slot } of mergeable) {
        if (slot.startsAt < start) start = slot.startsAt;
        if (slot.endsAt > end) end = slot.endsAt;
      }
      if (mergeable.length) {
        await tx.delete(availabilitySlots).where(
          inArray(
            availabilitySlots.id,
            mergeable.map((s) => s.slot.id),
          ),
        );
      }
      await tx
        .insert(availabilitySlots)
        .values({ groupId: input.groupId, userId: input.userId, startsAt: start, endsAt: end });
      return;
    }

    for (const { slot, locationIds } of slots.values()) {
      const overlaps = slot.startsAt < input.end && slot.endsAt > input.start;
      if (!overlaps) continue;
      await tx.delete(availabilitySlots).where(eq(availabilitySlots.id, slot.id));
      const pieces = [
        { startsAt: slot.startsAt, endsAt: input.start },
        { startsAt: input.end, endsAt: slot.endsAt },
      ].filter((p) => p.endsAt > p.startsAt);
      for (const piece of pieces) {
        const [created] = await tx
          .insert(availabilitySlots)
          .values({ groupId: slot.groupId, userId: slot.userId, note: slot.note, ...piece })
          .returning();
        if (locationIds.length) {
          await tx
            .insert(availabilitySlotLocations)
            .values(locationIds.map((locationId) => ({ slotId: created!.id, locationId })));
        }
      }
    }
  });
}
