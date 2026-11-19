import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { games, storeMembers } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import {
  addGuestEntry,
  createStoreEvent,
  getStoreEventForStaff,
  registerForStoreEvent,
  setCheckIn,
} from './store-events';
import { createStore } from './stores';
import {
  getStoreEventTournament,
  getTournament,
  nextRound,
  reportTable,
  startStoreTournament,
} from './tournaments';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const fixed = () => {
  let seed = 11;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

async function storeWithEvent(format = 'modern') {
  const admin = await createTestUser(db);
  const dono = await createTestUser(db, { name: 'Dono' });
  const { store } = await createStore(db, {
    name: `Loja ${Math.random()}`,
    city: 'Porto Alegre',
    email: 'x@loja.test',
    createdBy: admin.id,
  });
  await db.insert(storeMembers).values({ storeId: store.id, userId: dono.id, role: 'owner' });
  const event = await createStoreEvent(db, {
    storeId: store.id,
    userId: dono.id,
    title: 'Torneio da loja',
    startsAt: new Date(Date.now() + 86_400_000),
    format,
    kind: 'tournament',
  });
  return { store, dono, event };
}

describe('torneio no evento de loja (10.2b)', () => {
  it('a equipe começa com quem fez check-in (inclusive convidado); quem está na mesa ou a equipe registra', async () => {
    const { dono, event } = await storeWithEvent('modern');
    const [ana, bia, caio] = [
      await createTestUser(db, { name: 'Ana' }),
      await createTestUser(db, { name: 'Bia' }),
      await createTestUser(db, { name: 'Caio' }),
    ];
    for (const p of [ana, bia, caio])
      await registerForStoreEvent(db, { eventId: event.id, userId: p.id });
    const ze = await addGuestEntry(db, { eventId: event.id, userId: dono.id, name: 'Zé' });
    const staff = await getStoreEventForStaff(db, { eventId: event.id, userId: dono.id });
    // Caio não veio: só quem fez check-in entra.
    for (const e of staff.entries.filter((x) => x.name !== 'Caio'))
      await setCheckIn(db, { entryId: e.id, userId: dono.id, checkedIn: true });
    expect(ze.status).toBe('registered');

    // Quem não é da equipe não começa.
    await expect(
      startStoreTournament(db, { eventId: event.id, userId: ana.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const t = await startStoreTournament(db, {
      eventId: event.id,
      userId: dono.id,
      random: fixed(),
    });
    // Começou: a inscrição fecha (Caio, que não veio, não entra mais).
    await expect(
      registerForStoreEvent(db, { eventId: event.id, userId: (await createTestUser(db)).id }),
    ).rejects.toMatchObject({ code: 'conflict' });
    // Um torneio por evento.
    await expect(
      startStoreTournament(db, { eventId: event.id, userId: dono.id }),
    ).rejects.toMatchObject({ code: 'conflict' });

    // Qualquer pessoa acompanha (sem login também).
    const live = await getStoreEventTournament(db, { eventId: event.id, viewerId: null });
    expect(live!.tournament).toMatchObject({ status: 'running', table: 'pair', bestOf: 3 });
    expect(live!.entrants.map((e) => e.name).sort()).toEqual(['Ana', 'Bia', 'Zé']);
    expect(live!.canManage).toBe(false);
    const tables = live!.rounds[0]!.tables;
    expect(tables.map((x) => x.entrants.length).sort()).toEqual([1, 2]);

    const match = tables.find((x) => x.entrants.length === 2)!;
    const seated = match.entrants.map((id) => live!.entrants.find((e) => e.id === id)!);
    const player = seated.find((e) => e.memberIds.length > 0);
    // Alguém de fora da mesa não registra; quem está nela (ou a equipe) registra.
    await expect(
      reportTable(db, {
        tableId: match.id,
        userId: caio.id,
        gameWins: { [match.entrants[0]!]: 2 },
        gameDraws: 0,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await reportTable(db, {
      tableId: match.id,
      userId: player ? player.memberIds[0]! : dono.id,
      gameWins: { [match.entrants[0]!]: 2, [match.entrants[1]!]: 1 },
      gameDraws: 0,
    });
    // Não vira partida de grupo nenhum.
    expect(await db.select().from(games)).toEqual([]);

    const forStaff = await getTournament(db, { tournamentId: t.id, userId: dono.id });
    expect(forStaff.canManage).toBe(true);
    await nextRound(db, { tournamentId: t.id, userId: dono.id, random: fixed() });
    expect((await getTournament(db, { tournamentId: t.id, userId: ana.id })).rounds).toHaveLength(
      2,
    );
    await expect(nextRound(db, { tournamentId: t.id, userId: ana.id })).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('noite livre não tem torneio; 2HG e menos de 2 check-ins não começam', async () => {
    const casual = await storeWithEvent('commander');
    const noite = await createStoreEvent(db, {
      storeId: casual.store.id,
      userId: casual.dono.id,
      title: 'Noite livre',
      startsAt: new Date(Date.now() + 86_400_000),
      format: 'commander',
      kind: 'casual',
    });
    await expect(
      startStoreTournament(db, { eventId: noite.id, userId: casual.dono.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      startStoreTournament(db, { eventId: casual.event.id, userId: casual.dono.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    const duplas = await storeWithEvent('two_headed_giant');
    await expect(
      startStoreTournament(db, { eventId: duplas.event.id, userId: duplas.dono.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await getStoreEventTournament(db, { eventId: noite.id, viewerId: null })).toBeNull();
  });
});
