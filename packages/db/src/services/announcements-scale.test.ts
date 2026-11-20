import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { notifications } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { createAnnouncement, publishAnnouncement } from './announcements';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('aviso para todo mundo, com muita gente', () => {
  it('17 mil pessoas: passa do limite de parâmetros do Postgres num INSERT só, então grava em lotes', async () => {
    const admin = await createTestUser(db, { name: 'Admin' });
    await db.execute(sql`
      insert into "user" (id, name, email, email_verified, created_at, updated_at)
      select 'massa-' || g, 'Pessoa ' || g, 'p' || g || '@massa.test', true, now(), now()
      from generate_series(1, 17000) as g
    `);
    const draft = await createAnnouncement(db, {
      title: 'Novidades',
      body: 'Texto',
      groupId: null,
      createdBy: admin.id,
    });
    const published = await publishAnnouncement(db, { id: draft.id });
    expect(published.recipients).toBe(17001);
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications);
    expect(row!.n).toBe(17001);
  }, 60_000);
});
