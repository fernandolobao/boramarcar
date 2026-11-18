import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame } from './events';
import { listNotifications } from './inbox';
import { getMonthlyRecap, notifyMonthlyRecaps } from './monthly';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('retrospectiva do mês (8.12)', () => {
  it('traz o mês com primeiros nomes e avisa o grupo uma vez no dia 1', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [ana, bia] = players as [(typeof players)[0], (typeof players)[0]];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Sexta de Commander',
      startsAt: new Date('2026-11-13T22:00:00Z'),
    });
    await recordGame(db, {
      eventId: event.id,
      userId: ana.id,
      winningTurn: 6,
      playedAt: new Date('2026-11-13T23:00:00Z'),
      players: [
        { userId: ana.id, result: 'win' },
        { userId: bia.id, result: 'loss' },
      ],
    });

    const view = await getMonthlyRecap(db, {
      groupId: group.id,
      month: '2026-11',
      now: new Date('2026-12-01T12:00:00Z'),
    });
    expect(view!.recap).toMatchObject({ games: 1, nights: 1, winner: { userId: ana.id } });
    // Só o primeiro nome, sem e-mail nem nome do grupo.
    expect(Object.values(view!.names)).not.toContain(expect.stringContaining(' '));
    const json = JSON.stringify(view);
    expect(json).not.toContain('@');
    expect(json).not.toContain(group.name);
    expect(view!.eventTitles[event.id]).toBe('Sexta de Commander');
    // Mês que ainda não começou, mês inválido e grupo inexistente.
    expect(
      await getMonthlyRecap(db, {
        groupId: group.id,
        month: '2027-05',
        now: new Date('2026-12-01'),
      }),
    ).toBeNull();
    expect(await getMonthlyRecap(db, { groupId: group.id, month: 'nov' })).toBeNull();
    expect(await getMonthlyRecap(db, { groupId: 'nao-existe', month: '2026-11' })).toBeNull();

    // Grupo que não jogou em novembro não recebe nada.
    const quiet = await seedGroup(db, 1);
    const dec1 = new Date('2026-12-01T11:17:00Z');
    await notifyMonthlyRecaps(db, dec1);
    await notifyMonthlyRecaps(db, dec1);
    const inbox = await listNotifications(db, { userId: bia.id });
    expect(inbox.filter((n) => n.kind === 'monthly')).toEqual([
      expect.objectContaining({ data: { kind: 'monthly', groupId: group.id, month: '2026-11' } }),
    ]);
    const other = await listNotifications(db, { userId: quiet.players[0]!.id });
    expect(other.filter((n) => n.kind === 'monthly')).toEqual([]);
  });
});
