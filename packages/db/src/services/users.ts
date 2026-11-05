import { assertTimeZone, DEFAULT_TIME_ZONE, DomainError } from '@boramarcar/core';
import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { user } from '../schema';

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
