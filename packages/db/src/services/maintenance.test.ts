import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { notifications } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { purgeOldNotifications } from './inbox';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const DAY = 86_400_000;

describe('manutenção do banco', () => {
  it('notificações lidas há mais de 180 dias saem; as não lidas e as recentes ficam', async () => {
    const ana = await createTestUser(db);
    const now = new Date('2026-11-25T12:00:00Z');
    const row = (daysAgo: number, read: boolean) => ({
      userId: ana.id,
      groupId: null,
      kind: 'announcement',
      data: { kind: 'announcement', announcementId: `a${daysAgo}${read}` },
      createdAt: new Date(now.getTime() - daysAgo * DAY),
      readAt: read ? new Date(now.getTime() - (daysAgo - 1) * DAY) : null,
    });
    await db.insert(notifications).values([row(400, true), row(400, false), row(30, true)]);
    expect(await purgeOldNotifications(db, now)).toBe(1);
    const left = await db.select({ readAt: notifications.readAt }).from(notifications);
    expect(left).toHaveLength(2);
  });

  it('índices para o cron de lembretes, a limpeza dos limites e a retrospectiva', async () => {
    const rows = await db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where schemaname = 'public'`,
    );
    const names = (rows as unknown as { rows: { indexname: string }[] }).rows.map(
      (r) => r.indexname,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'events_reminder_due_idx',
        'rate_limits_window_start_idx',
        'notifications_group_kind_idx',
      ]),
    );
  });
});
