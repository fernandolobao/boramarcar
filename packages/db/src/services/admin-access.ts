import { asc, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { adminAccessLog } from '../schema';

/** Registra que um admin viu um dado que a pessoa não deixou visível para ele. */
export async function logAdminAccess(
  db: Database,
  input: {
    adminId: string;
    targetUserId: string;
    resource: 'deck' | 'profile_decks';
    resourceId?: string | null;
  },
) {
  if (input.adminId === input.targetUserId) return;
  await db.insert(adminAccessLog).values({
    adminId: input.adminId,
    targetUserId: input.targetUserId,
    resource: input.resource,
    resourceId: input.resourceId ?? null,
  });
}

/** Acessos de admins aos dados de uma pessoa, mais antigos primeiro. */
export async function listAdminAccess(db: Database, input: { targetUserId: string }) {
  return db
    .select({
      adminId: adminAccessLog.adminId,
      resource: adminAccessLog.resource,
      resourceId: adminAccessLog.resourceId,
      at: adminAccessLog.createdAt,
    })
    .from(adminAccessLog)
    .where(eq(adminAccessLog.targetUserId, input.targetUserId))
    .orderBy(asc(adminAccessLog.createdAt));
}
