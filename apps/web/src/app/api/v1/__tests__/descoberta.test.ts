import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { storeEvents, stores } from '@boramarcar/db/schema';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const discovery = await import('../discovery/route');
const ics = await import('../store-events/[eventId]/ics/route');

let close: () => Promise<void>;
const ids: { open?: string; cancelled?: string } = {};

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  testState.user = null;
  close = testDb.close;
  const owner = await createTestUser(testDb.db);
  const [store] = await testDb.db
    .insert(stores)
    .values({
      slug: 'loja-curitiba',
      name: 'Loja de Curitiba',
      city: 'Curitiba',
      municipalityCode: '4106902',
      contactEmail: 'c@x.test',
      createdBy: owner.id,
    })
    .returning();
  const soon = new Date(Date.now() + 2 * 86_400_000);
  const rows = await testDb.db
    .insert(storeEvents)
    .values([
      {
        storeId: store!.id,
        title: 'Commander de sexta',
        startsAt: soon,
        format: 'commander',
        kind: 'tournament',
        code: 'ABC234',
      },
      {
        storeId: store!.id,
        title: 'Cancelado',
        startsAt: soon,
        format: 'commander',
        kind: 'casual',
        code: 'XYZ234',
        status: 'cancelled',
      },
    ])
    .returning();
  ids.open = rows[0]!.id;
  ids.cancelled = rows[1]!.id;
});
afterAll(() => close());

describe('descoberta pela API (10.3)', () => {
  it('pela cidade, sem login: eventos e lojas, com a cidade de origem', async () => {
    const res = await call(discovery.GET, { path: '/api/v1/discovery?city=pr/curitiba' });
    expect(res.status).toBe(200);
    expect(res.body!.origin).toMatchObject({ kind: 'city', city: { name: 'Curitiba', uf: 'PR' } });
    expect(res.body!.events.map((e: { title: string }) => e.title)).toEqual(['Commander de sexta']);
    expect(res.body!.stores[0]).toMatchObject({ slug: 'loja-curitiba' });
    expect(res.headers.get('cache-control')).toContain('s-maxage');
  });

  it('pela posição do aparelho; nada de cache compartilhado', async () => {
    const res = await call(discovery.GET, { path: '/api/v1/discovery?lat=-25.43&lng=-49.27' });
    expect(res.status).toBe(200);
    expect(res.body!.origin).toEqual({ kind: 'device' });
    expect(res.body!.stores).toHaveLength(1);
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('coordenadas inválidas, cidade inexistente ou sem origem: erro claro, nunca 500', async () => {
    for (const q of ['lat=NaN&lng=0', 'lat=91&lng=0', 'lat=0&lng=200', 'lat=x&lng=y']) {
      expect((await call(discovery.GET, { path: `/api/v1/discovery?${q}` })).status).toBe(400);
    }
    expect((await call(discovery.GET, { path: '/api/v1/discovery' })).status).toBe(400);
    expect(
      (await call(discovery.GET, { path: '/api/v1/discovery?city=pr/nao-existe' })).status,
    ).toBe(404);
  });

  it('"Adicionar à agenda" sem login: .ics do evento agendado; cancelado não tem', async () => {
    const ok = await fetchIcs(ids.open!);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toContain('text/calendar');
    expect(ok.text).toContain('BEGIN:VCALENDAR');
    expect(ok.text).toContain('Commander de sexta');
    expect((await fetchIcs(ids.cancelled!)).status).toBe(404);
    expect((await fetchIcs('nao-existe')).status).toBe(404);
  });
});

async function fetchIcs(eventId: string) {
  const res = await ics.GET(new Request(`http://localhost/api/v1/store-events/${eventId}/ics`), {
    params: Promise.resolve({ eventId }),
  });
  return { status: res.status, headers: res.headers, text: await res.text() };
}
