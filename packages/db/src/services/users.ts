import { assertTimeZone, DEFAULT_TIME_ZONE, DomainError } from '@boramarcar/core';
import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { user } from '../schema';

export async function getUserPreferences(db: Database, userId: string) {
  const [row] = await db
    .select({ timeZone: user.timeZone })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Usuário não encontrado');
  return { timeZone: row.timeZone ?? DEFAULT_TIME_ZONE, timeZoneIsDefault: !row.timeZone };
}

export async function updateUserPreferences(
  db: Database,
  input: { userId: string; timeZone: string },
) {
  assertTimeZone(input.timeZone);
  const [row] = await db
    .update(user)
    .set({ timeZone: input.timeZone, updatedAt: new Date() })
    .where(eq(user.id, input.userId))
    .returning({ timeZone: user.timeZone });
  if (!row) throw new DomainError('not_found', 'Usuário não encontrado');
  return { timeZone: row.timeZone! };
}
