import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { account, collectionCards, decks } from '../schema';
import { createGroup } from './groups';
import { seedGroup } from '../test/helpers';
import { addAvailability } from './availability';
import { createEvent, recordGame, setRsvp } from './events';
import { createFeedback } from './feedback';
import { markOnboarding } from './onboarding';
import { getProductMetrics, listUsersForAdmin } from './metrics';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

type P = { id: string };
const DAY = 86_400_000;

describe('métricas do produto', () => {
  it('conta grupos ativos (partida em 28 dias), encontros, convites e ativação, só agregados', async () => {
    const now = new Date();
    // Grupo A: 3 pessoas, encontro há 2 dias com mesa cheia e partida registrada.
    const a = await seedGroup(db, 3);
    const [a1, a2, a3] = a.players as unknown as [P, P, P];
    const event = await createEvent(db, {
      groupId: a.group.id,
      userId: a1.id,
      title: 'Commander',
      startsAt: new Date(now.getTime() - 2 * DAY),
      participantIds: [a1.id, a2.id, a3.id],
    });
    for (const p of [a1, a2, a3])
      await setRsvp(db, { eventId: event.id, userId: p.id, rsvp: 'yes' });
    await recordGame(db, {
      eventId: event.id,
      userId: a1.id,
      format: 'standard',
      players: [
        { userId: a1.id, result: 'win' },
        { userId: a2.id, result: 'loss' },
      ],
    });
    await addAvailability(db, {
      groupId: a.group.id,
      userId: a2.id,
      startsAt: new Date(now.getTime() + DAY),
      endsAt: new Date(now.getTime() + DAY + 3 * 3600_000),
    });
    // Grupo B: só a dona, sem encontro nem partida.
    const b = await seedGroup(db, 1);
    await createFeedback(db, {
      userId: (b.players[0] as P).id,
      kind: 'idea',
      message: 'Uma ideia boa',
      platform: 'web',
    });

    // `now` um pouco à frente: o `created_at` do banco tem microssegundos e pode ficar depois do
    // relógio do JS (milissegundos) no mesmo instante, e a janela é fechada em `now` (`<`).
    const m = await getProductMetrics(db, new Date(Date.now() + 1000));
    expect(m).toMatchObject({
      windowDays: 28,
      activeGroups: 1,
      totalGroups: 2,
      newGroups: { count: 2, withThreeMembers: 1, withEvent: 1 },
      invites: { joins: 2 },
      events: { held: 1, tableFilled: 0, withGame: 1 },
      games: { playerSlots: 2, withDeck: 0 },
      users: { total: 4, new: 4, withAvailability: 1 },
      feedback: 1,
      retention: { previous: 0, retained: 0 },
    });
    // Nada de nomes, e-mails ou IDs no resultado.
    expect(JSON.stringify(m)).not.toMatch(/@|P1|Mesa de Quinta/);
  });

  it('registro pós-jogo: tempo até a primeira partida e quantos encontros registram em 24 h', async () => {
    const { db: fresh, close: closeFresh } = await createTestDb();
    const now = new Date();
    const g = await seedGroup(fresh, 2);
    const [p1, p2] = g.players as unknown as [P, P];
    const event = (hoursAgo: number) =>
      createEvent(fresh, {
        groupId: g.group.id,
        userId: p1.id,
        title: 'Commander',
        startsAt: new Date(now.getTime() - hoursAgo * 3600_000),
      });
    const quick = await event(1);
    const late = await event(48);
    await event(72); // sem partida
    for (const e of [quick, late]) {
      await recordGame(fresh, {
        eventId: e.id,
        userId: p1.id,
        players: [
          { userId: p1.id, result: 'win' },
          { userId: p2.id, result: 'loss' },
        ],
      });
    }
    const m = await getProductMetrics(fresh, now);
    expect(m.postGame.withGame).toBe(2);
    expect(m.postGame.within24h).toBe(1);
    // Mediana entre ~1 h e ~48 h depois do início.
    expect(m.postGame.medianMinutes).toBeGreaterThan(60 * 20);
    expect(m.postGame.medianMinutes).toBeLessThan(60 * 30);
    await closeFresh();
  });

  it('ativação do onboarding: guias concluídos e pulados e dicas dispensadas, só contagens', async () => {
    const { db: fresh, close: closeFresh } = await createTestDb();
    const people = await Promise.all(
      ['A', 'B', 'C'].map((name) => createTestUser(fresh, { name })),
    );
    await markOnboarding(fresh, { userId: people[0]!.id, flag: 'guide-completed' });
    await markOnboarding(fresh, { userId: people[1]!.id, flag: 'guide-completed' });
    await markOnboarding(fresh, { userId: people[2]!.id, flag: 'guide-skipped' });
    await markOnboarding(fresh, { userId: people[0]!.id, flag: 'tip-table' });
    await markOnboarding(fresh, { userId: people[1]!.id, flag: 'tip-table' });
    await markOnboarding(fresh, { userId: people[1]!.id, flag: 'tip-collection' });
    expect((await getProductMetrics(fresh)).onboarding).toEqual({
      guideCompleted: 2,
      guideSkipped: 1,
      tipsDismissed: { 'deck-analysis': 0, table: 2, collection: 1, ranking: 0 },
    });
    await closeFresh();
  });

  it('banco vazio não quebra', async () => {
    const { db: empty, close: closeEmpty } = await createTestDb();
    expect((await getProductMetrics(empty)).activeGroups).toBe(0);
    await closeEmpty();
  });
});

describe('contas para o /admin', () => {
  it('lista as contas ativas com como entram, grupos e último acesso', async () => {
    const { db, close: closeDb } = await createTestDb();
    const ana = await createTestUser(db, { name: 'Ana', email: 'ana@admin.test' });
    const bia = await createTestUser(db, { name: 'Bia', email: 'bia@admin.test' });
    await createTestUser(db, { name: 'Excluída', deletedAt: new Date() });
    await db.insert(account).values([
      { id: 'a1', accountId: 'g-1', providerId: 'google', userId: ana.id },
      { id: 'a2', accountId: bia.id, providerId: 'credential', userId: bia.id, password: 'x' },
    ]);
    await createGroup(db, { name: 'Mesa', userId: ana.id });
    // Ana: 2 decks e 3 cartas na coleção (2 cópias de uma, 1 de outra).
    await db.insert(decks).values([
      { ownerId: ana.id, name: 'Um', source: 'text' },
      { ownerId: ana.id, name: 'Dois', source: 'text' },
    ]);
    await db.insert(collectionCards).values([
      { userId: ana.id, cardName: 'Sol Ring', quantity: 2 },
      { userId: ana.id, cardName: 'Forest', quantity: 1 },
    ]);
    const list = await listUsersForAdmin(db);
    expect(list.map((u) => u.name).sort()).toEqual(['Ana', 'Bia']);
    expect(list.find((u) => u.name === 'Ana')).toMatchObject({
      providers: ['google'],
      groups: 1,
      decks: 2,
      collectionCards: 3,
    });
    expect(list.find((u) => u.name === 'Bia')).toMatchObject({
      providers: ['credential'],
      groups: 0,
      decks: 0,
      collectionCards: 0,
      lastSeenAt: null,
    });
    await closeDb();
  });
});
