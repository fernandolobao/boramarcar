import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { storeMembers } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { listNotifications } from './inbox';
import {
  addGuestEntry,
  cancelStoreEntry,
  cancelStoreEvent,
  createStoreEvent,
  getStoreEventForStaff,
  getStoreEventPublic,
  listMyStoreEntries,
  listStoreEvents,
  registerByCode,
  registerForStoreEvent,
  setCheckIn,
  updateStoreEvent,
} from './store-events';
import { createStore } from './stores';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

async function setup() {
  const admin = await createTestUser(db);
  const dono = await createTestUser(db, { name: 'Dono' });
  const { store } = await createStore(db, {
    name: `Loja ${Math.random()}`,
    municipalityCode: '4314902',
    email: 'x@loja.test',
    createdBy: admin.id,
  });
  await db.insert(storeMembers).values({ storeId: store.id, userId: dono.id, role: 'owner' });
  return { store, dono };
}
const soon = new Date(Date.now() + 3 * 86_400_000);

describe('eventos de loja (10.2a)', () => {
  it('equipe cria; vagas com lista de espera; quem desiste libera para o primeiro da fila', async () => {
    const { store, dono } = await setup();
    const [ana, bia, caio] = [
      await createTestUser(db, { name: 'Ana' }),
      await createTestUser(db, { name: 'Bia' }),
      await createTestUser(db, { name: 'Caio' }),
    ];
    const estranho = await createTestUser(db);
    await expect(
      createStoreEvent(db, {
        storeId: store.id,
        userId: estranho.id,
        title: 'X',
        startsAt: soon,
        format: 'commander',
        kind: 'casual',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const ev = await createStoreEvent(db, {
      storeId: store.id,
      userId: dono.id,
      title: 'Commander de sexta',
      startsAt: soon,
      format: 'commander',
      kind: 'tournament',
      capacity: 2,
      prizes: '1º lugar: booster',
      rules: 'Bracket 3',
    });
    expect(ev.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    expect(await registerForStoreEvent(db, { eventId: ev.id, userId: ana.id })).toMatchObject({
      status: 'registered',
    });
    // Pelo código do balcão, em minúsculas e com espaço.
    expect(
      await registerByCode(db, { code: ` ${ev.code.toLowerCase()} `, userId: bia.id }),
    ).toMatchObject({ status: 'registered', eventId: ev.id });
    expect(await registerForStoreEvent(db, { eventId: ev.id, userId: caio.id })).toMatchObject({
      status: 'waitlist',
    });
    await expect(
      registerForStoreEvent(db, { eventId: ev.id, userId: ana.id }),
    ).rejects.toMatchObject({ code: 'conflict' });

    const pub = await getStoreEventPublic(db, { eventId: ev.id, viewerId: caio.id });
    expect(pub).toMatchObject({
      title: 'Commander de sexta',
      registered: 2,
      waitlist: 1,
      capacity: 2,
      prizes: '1º lugar: booster',
      myEntry: { status: 'waitlist' },
    });
    // O código do balcão não aparece para quem não é da equipe.
    expect(JSON.stringify(pub)).not.toContain(ev.code);

    const anaEntry = (
      await getStoreEventForStaff(db, { eventId: ev.id, userId: dono.id })
    ).entries.find((e) => e.name === 'Ana')!;
    // Outra pessoa não tira a inscrição da Ana; ela mesma tira.
    await expect(
      cancelStoreEntry(db, { entryId: anaEntry.id, userId: bia.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await cancelStoreEntry(db, { entryId: anaEntry.id, userId: ana.id });
    expect(
      (await getStoreEventPublic(db, { eventId: ev.id, viewerId: caio.id }))!.myEntry,
    ).toMatchObject({ status: 'registered' });
    // Quem saiu da fila recebe o aviso no sino, com o evento e a loja.
    const [notice] = await listNotifications(db, { userId: caio.id });
    expect(notice).toMatchObject({
      kind: 'store_event',
      data: { kind: 'store_event', storeEventId: ev.id, event: 'promoted' },
      storeEvent: { title: 'Commander de sexta', slug: store.slug },
    });
    // Quem já estava inscrito não recebe nada.
    expect(await listNotifications(db, { userId: bia.id })).toEqual([]);
  });

  it('convidado sem conta (pela equipe), check-in, mais vagas sobem a fila, cancelar e listar', async () => {
    const { store, dono } = await setup();
    const ana = await createTestUser(db, { name: 'Ana' });
    const ev = await createStoreEvent(db, {
      storeId: store.id,
      userId: dono.id,
      title: 'Noite livre',
      startsAt: soon,
      format: 'commander',
      kind: 'casual',
      capacity: 1,
    });
    const guest = await addGuestEntry(db, {
      eventId: ev.id,
      userId: dono.id,
      name: 'Zé da Esquina',
    });
    expect(guest.status).toBe('registered');
    await expect(
      addGuestEntry(db, { eventId: ev.id, userId: ana.id, name: 'Intruso' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect((await registerForStoreEvent(db, { eventId: ev.id, userId: ana.id })).status).toBe(
      'waitlist',
    );
    await setCheckIn(db, { entryId: guest.id, userId: dono.id, checkedIn: true });
    // A loja aumenta as vagas: a Ana sai da fila.
    await updateStoreEvent(db, { eventId: ev.id, userId: dono.id, capacity: 2 });
    const staff = await getStoreEventForStaff(db, { eventId: ev.id, userId: dono.id });
    expect(staff.code).toBe(ev.code);
    expect(staff.entries.map((e) => [e.name, e.guest, e.status, Boolean(e.checkedInAt)])).toEqual([
      ['Zé da Esquina', true, 'registered', true],
      ['Ana', false, 'registered', false],
    ]);
    await expect(
      getStoreEventForStaff(db, { eventId: ev.id, userId: ana.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const upcoming = await listStoreEvents(db, { storeId: store.id, when: 'upcoming' });
    expect(upcoming.map((e) => e.title)).toEqual(['Noite livre']);
    await cancelStoreEvent(db, { eventId: ev.id, userId: dono.id });
    await expect(
      registerForStoreEvent(db, { eventId: ev.id, userId: (await createTestUser(db)).id }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await expect(registerByCode(db, { code: 'ZZZZZZ', userId: ana.id })).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('meus eventos de loja', () => {
  it('os próximos em que a pessoa está inscrita ou na fila, com a loja; passados e cancelados não', async () => {
    const { store, dono } = await setup();
    const ana = await createTestUser(db, { name: 'Ana' });
    const make = (title: string, days: number) =>
      createStoreEvent(db, {
        storeId: store.id,
        userId: dono.id,
        title,
        startsAt: new Date(Date.now() + days * 86_400_000),
        format: 'commander',
        kind: 'casual',
      });
    const [cedo, tarde, cancelado] = [
      await make('Cedo', 2),
      await make('Tarde', 9),
      await make('Cancelado', 4),
    ];
    for (const ev of [tarde, cedo, cancelado])
      await registerForStoreEvent(db, { eventId: ev.id, userId: ana.id });
    await cancelStoreEvent(db, { eventId: cancelado.id, userId: dono.id });
    const mine = await listMyStoreEntries(db, { userId: ana.id });
    expect(mine.map((m) => m.event.title)).toEqual(['Cedo', 'Tarde']);
    expect(mine[0]).toMatchObject({ status: 'registered', store: { slug: store.slug } });
  });
});
