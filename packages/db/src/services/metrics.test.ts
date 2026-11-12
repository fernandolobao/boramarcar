import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { addAvailability } from './availability';
import { createEvent, recordGame, setRsvp } from './events';
import { createFeedback } from './feedback';
import { getProductMetrics } from './metrics';

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

    const m = await getProductMetrics(db, new Date());
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

  it('banco vazio não quebra', async () => {
    const { db: empty, close: closeEmpty } = await createTestDb();
    expect((await getProductMetrics(empty)).activeGroups).toBe(0);
    await closeEmpty();
  });
});
