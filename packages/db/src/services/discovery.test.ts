import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { storeEventEntries, storeEvents, stores } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { citiesWithStores, findNearby, nearestCitiesWithStores } from './discovery';

let db: Database;
let close: () => Promise<void>;
const now = new Date('2026-11-20T12:00:00Z');
const day = 86_400_000;
const osasco = { lat: -23.5324, lng: -46.7916 };
/** Ponto a `km` a leste de Osasco. */
const east = (km: number) => ({
  lat: osasco.lat,
  lng: osasco.lng + km / (111.32 * Math.cos((osasco.lat * Math.PI) / 180)),
});

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  const owner = await createTestUser(db);
  const store = (
    slug: string,
    extra: Partial<typeof stores.$inferInsert> = {},
  ): typeof stores.$inferInsert => ({
    slug,
    name: slug,
    city: 'x',
    contactEmail: `${slug}@x.test`,
    createdBy: owner.id,
    ...extra,
  });
  await db.insert(stores).values([
    // São Paulo, com endereço (~16 km de Osasco).
    store('sp-loja', {
      municipalityCode: '3550308',
      lat: -23.5505,
      lng: -46.6333,
      offers: ['singles', 'play_space'],
      formats: ['commander'],
      verified: true,
    }),
    // Sem endereço: vale o centro de Osasco.
    store('osasco-loja', { municipalityCode: '3534401', offers: ['sealed'] }),
    // A 51 km: fora do raio.
    store('longe-loja', { municipalityCode: '3550308', ...east(51) }),
    // Antiga: sem município e sem endereço — fica de fora, sem erro.
    store('antiga-loja'),
  ]);
  const [sp] = await db.select().from(stores).where(eqSlug('sp-loja'));
  const [longe] = await db.select().from(stores).where(eqSlug('longe-loja'));
  const event = (
    storeId: string,
    title: string,
    startsAt: Date,
    extra: Partial<typeof storeEvents.$inferInsert> = {},
  ): typeof storeEvents.$inferInsert => ({
    storeId,
    title,
    startsAt,
    format: 'commander',
    kind: 'tournament',
    code: title.slice(0, 6).toUpperCase().padEnd(6, 'X'),
    capacity: 8,
    ...extra,
  });
  const inserted = await db
    .insert(storeEvents)
    .values([
      event(sp!.id, 'AMANHA', new Date(now.getTime() + day)),
      event(sp!.id, 'CASUAL', new Date(now.getTime() + 2 * day), {
        kind: 'casual',
        format: 'modern',
      }),
      event(sp!.id, 'CANCEL', new Date(now.getTime() + day), { status: 'cancelled' }),
      event(sp!.id, 'PASSOU', new Date(now.getTime() - 3_600_000)),
      event(sp!.id, 'LONGEX', new Date(now.getTime() + 31 * day)),
      event(longe!.id, 'FORARA', new Date(now.getTime() + day)),
    ])
    .returning();
  const amanha = inserted.find((e) => e.title === 'AMANHA')!;
  const a = await createTestUser(db);
  const b = await createTestUser(db);
  await db.insert(storeEventEntries).values([
    { storeEventId: amanha.id, userId: a.id, status: 'registered' },
    { storeEventId: amanha.id, userId: b.id, status: 'waitlist' },
    { storeEventId: amanha.id, guestName: 'Zé', status: 'registered' },
  ]);
});
afterAll(() => close());

import { eq } from 'drizzle-orm';
const eqSlug = (slug: string) => eq(stores.slug, slug);

describe('descoberta: lojas e eventos por perto (10.3)', () => {
  it('lojas no raio, mais perto primeiro; fora do raio e loja antiga sem cidade não aparecem', async () => {
    const { stores: found } = await findNearby(db, { ...osasco, now });
    expect(found.map((s) => s.slug)).toEqual(['osasco-loja', 'sp-loja']);
    expect(found[0]!.distanceKm).toBe(0);
    expect(found[1]).toMatchObject({
      municipality: { name: 'São Paulo', uf: 'SP', slug: 'sao-paulo' },
      offers: ['singles', 'play_space'],
      verified: true,
      nextEvent: { title: 'AMANHA' },
    });
    expect(found[1]!.distanceKm).toBeGreaterThan(15);
    expect(found[1]!.distanceKm).toBeLessThan(18);
  });

  it('eventos agendados dos próximos 30 dias, sem cancelados nem os que já começaram', async () => {
    const { events } = await findNearby(db, { ...osasco, now });
    expect(events.map((e) => e.title)).toEqual(['AMANHA', 'CASUAL']);
    expect(events[0]).toMatchObject({
      capacity: 8,
      registered: 2,
      waitlist: 1,
      store: { slug: 'sp-loja', name: 'sp-loja', municipality: { name: 'São Paulo', uf: 'SP' } },
    });
    // Sem nomes de quem se inscreveu.
    expect(JSON.stringify(events)).not.toContain('Zé');
  });

  it('filtros: formato, tipo de evento e o que a loja oferece', async () => {
    expect(
      (await findNearby(db, { ...osasco, now, formats: ['modern'] })).events.map((e) => e.title),
    ).toEqual(['CASUAL']);
    expect(
      (await findNearby(db, { ...osasco, now, kinds: ['tournament'] })).events.map((e) => e.title),
    ).toEqual(['AMANHA']);
    expect(
      (await findNearby(db, { ...osasco, now, offers: ['sealed'] })).stores.map((s) => s.slug),
    ).toEqual(['osasco-loja']);
  });

  it('cidades com loja própria (para o sitemap) e as mais próximas de um ponto', async () => {
    const cities = await citiesWithStores(db);
    expect(cities.map((c) => `${c.slug}/${c.uf}`).sort()).toEqual(['osasco/SP', 'sao-paulo/SP']);
    expect(cities.find((c) => c.slug === 'sao-paulo')!.stores).toBe(2);
    const near = await nearestCitiesWithStores(db, { lat: -22.9, lng: -47.06, limit: 1 });
    expect(near).toHaveLength(1);
  });
});
