import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { listActivity, purgeActivity, recordActivity } from './activity';
import { deleteUserAccount, exportUserData } from './privacy';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const at = (iso: string) => new Date(iso);

describe('registro de atividade', () => {
  it('soma na mesma hora (uma linha só) e separa por hora e por alvo', async () => {
    const ana = await createTestUser(db, { name: 'Ana Atividade' });
    for (const [n, time] of [
      [10, '2026-11-26T10:05:00Z'],
      [27, '2026-11-26T10:40:00Z'],
      [3, '2026-11-26T11:10:00Z'],
    ] as const) {
      await recordActivity(db, {
        userId: ana.id,
        kind: 'collection_added',
        count: n,
        at: at(time),
      });
    }
    await recordActivity(db, {
      userId: ana.id,
      kind: 'deck_updated',
      targetId: 'd1',
      label: 'Omnath',
      at: at('2026-11-26T10:10:00Z'),
    });
    await recordActivity(db, {
      userId: ana.id,
      kind: 'deck_updated',
      targetId: 'd1',
      label: 'Omnath Ramp',
      at: at('2026-11-26T10:20:00Z'),
    });
    await recordActivity(db, {
      userId: ana.id,
      kind: 'deck_updated',
      targetId: 'd2',
      label: 'Elfos',
      at: at('2026-11-26T10:30:00Z'),
    });

    const { items } = await listActivity(db, {
      since: at('2026-11-26T00:00:00Z'),
      query: 'Ana Atividade',
    });
    const coll = items.filter((i) => i.kind === 'collection_added');
    expect(coll.map((i) => i.count)).toEqual([3, 37]);
    const decks = items.filter((i) => i.kind === 'deck_updated');
    expect(decks).toHaveLength(2);
    // O nome mais recente do deck fica na linha.
    expect(decks.find((d) => d.targetId === 'd1')).toMatchObject({
      count: 2,
      label: 'Omnath Ramp',
    });
    // Mais recente primeiro.
    expect(items[0]).toMatchObject({ kind: 'collection_added', count: 3 });
    expect(items[0]!.userName).toBe('Ana Atividade');
  });

  it('filtra por tipo, grupo, pessoa (nome ou e-mail) e período; pagina', async () => {
    const { owner, group } = await seedGroup(db, 1);
    await recordActivity(db, { userId: owner.id, kind: 'login', at: at('2026-11-26T09:00:00Z') });
    await recordActivity(db, {
      userId: owner.id,
      kind: 'event_created',
      groupId: group.id,
      targetId: 'e1',
      label: 'Commander',
      at: at('2026-11-26T09:30:00Z'),
    });
    await recordActivity(db, { userId: owner.id, kind: 'login', at: at('2026-10-01T09:00:00Z') });

    const since = at('2026-11-20T00:00:00Z');
    const byKind = await listActivity(db, { since, kind: 'login', query: owner.email });
    expect(byKind.items).toHaveLength(1);
    const byGroup = await listActivity(db, { since, groupId: group.id });
    expect(byGroup.items).toMatchObject([{ kind: 'event_created', groupName: group.name }]);
    const old = await listActivity(db, { since: at('2026-09-01T00:00:00Z'), query: owner.email });
    expect(old.items).toHaveLength(3);
    const page = await listActivity(db, {
      since: at('2026-09-01T00:00:00Z'),
      query: owner.email,
      limit: 2,
    });
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
  });

  it('limpa o que tem mais de 90 dias', async () => {
    const bia = await createTestUser(db, { name: 'Bia Limpeza' });
    await recordActivity(db, { userId: bia.id, kind: 'login', at: at('2026-08-01T10:00:00Z') });
    await recordActivity(db, { userId: bia.id, kind: 'login', at: at('2026-11-25T10:00:00Z') });
    const removed = await purgeActivity(db, at('2026-11-26T12:00:00Z'));
    expect(removed).toBeGreaterThanOrEqual(1);
    const left = await listActivity(db, {
      since: at('2026-01-01T00:00:00Z'),
      query: 'Bia Limpeza',
    });
    expect(left.items).toHaveLength(1);
  });

  it('LGPD: entra na exportação e sai com a conta', async () => {
    const caio = await createTestUser(db, { name: 'Caio LGPD' });
    await recordActivity(db, {
      userId: caio.id,
      kind: 'deck_created',
      targetId: 'dx',
      label: 'Meu deck',
    });
    expect((await listActivity(db, { since: new Date(0), userId: caio.id })).items).toHaveLength(1);
    const data = await exportUserData(db, caio.id);
    expect(data.activity).toMatchObject([{ kind: 'deck_created', label: 'Meu deck', count: 1 }]);
    await deleteUserAccount(db, caio.id);
    const before = await listActivity(db, { since: new Date(0), userId: caio.id });
    expect(before.items).toHaveLength(0);
  });
});
