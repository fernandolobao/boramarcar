import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { listNewAchievements, markAchievementsSeen } from './achievements';
import { createEvent, recordGame } from './events';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('conquistas novas (janela no painel e no perfil)', () => {
  it('1º acesso só marca o ponto de partida; depois mostra as novas até serem vistas', async () => {
    const { group, players, owner } = await seedGroup(db, 2);
    const other = players[1]!;
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'X',
      startsAt: new Date('2026-01-01T22:00:00Z'),
    });
    const play = (day: number) =>
      recordGame(db, {
        eventId: event.id,
        userId: owner.id,
        playedAt: new Date(Date.UTC(2026, 0, day)),
        players: [
          { userId: owner.id, result: 'win' },
          { userId: other.id, result: 'loss' },
        ],
      });
    await play(2);

    // Primeiro acesso: o que já foi conquistado conta como visto (nada de enxurrada).
    expect(await listNewAchievements(db, { userId: owner.id })).toEqual([]);
    expect(await listNewAchievements(db, { userId: owner.id })).toEqual([]);

    // Mais duas vitórias: "Embalado" (3 seguidas). Uma partida registrada depois, mesmo com
    // data anterior, também conta.
    await play(3);
    await play(1);
    const fresh = await listNewAchievements(db, { userId: owner.id });
    expect(fresh.map((a) => a.id)).toEqual(['streak_3']);

    // Continua aparecendo até ser vista; depois de vista, some.
    expect((await listNewAchievements(db, { userId: owner.id })).map((a) => a.id)).toEqual([
      'streak_3',
    ]);
    await markAchievementsSeen(db, { userId: owner.id, ids: ['streak_3'] });
    expect(await listNewAchievements(db, { userId: owner.id })).toEqual([]);
  });
});
