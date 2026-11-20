import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent } from './events';
import {
  addEntrant,
  createTournament,
  getTournament,
  nextRound,
  reportTable,
  startTournament,
} from './tournaments';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const fixed = () => {
  let seed = 5;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

async function setup(size: number, format: string, extra: Record<string, unknown>) {
  const { players, owner, group } = await seedGroup(db, size);
  const event = await createEvent(db, {
    groupId: group.id,
    userId: owner.id,
    title: 'Noite',
    startsAt: new Date('2026-11-20T22:00:00Z'),
  });
  const tournament = await createTournament(db, {
    eventId: event.id,
    userId: owner.id,
    name: 'Copa',
    format,
    ...extra,
  });
  for (const p of players)
    await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
  return { owner, tournament };
}

/** Registra as mesas abertas da rodada atual: vence o primeiro de cada mesa. */
async function play(tournamentId: string, userId: string) {
  const view = await getTournament(db, { tournamentId, userId });
  for (const table of view.rounds.at(-1)!.tables.filter((x) => !x.reported)) {
    await reportTable(db, {
      tableId: table.id,
      userId,
      gameWins: { [table.entrants[0]!]: 2 },
      gameDraws: 0,
    });
  }
}

describe('estruturas de torneio', () => {
  it('recusa estrutura que não existe para o tipo de mesa e top cut fora do suíço', async () => {
    await expect(setup(4, 'commander', { structure: 'round_robin' })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(
      setup(6, 'modern', { structure: 'single_elimination', topCut: 4 }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('eliminação simples com 6: byes na 1ª rodada, quem perde sai, campeão na final', async () => {
    const { owner, tournament } = await setup(6, 'modern', { structure: 'single_elimination' });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament).toMatchObject({ structure: 'single_elimination', rounds: 3 });
    const first = view.rounds[0]!;
    expect(first.tables.map((x) => x.entrants.length).sort()).toEqual([1, 1, 2, 2]);
    // Chave de 8: a 1ª rodada já são as quartas.
    expect(first.stageName).toBe('quarterfinal');
    // Mesa de eliminação precisa de um vencedor.
    const open = first.tables.find((x) => x.entrants.length === 2)!;
    await expect(
      reportTable(db, {
        tableId: open.id,
        userId: owner.id,
        gameWins: { [open.entrants[0]!]: 1, [open.entrants[1]!]: 1 },
        gameDraws: 1,
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    await play(tournament.id, owner.id);
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.rounds.at(-1)).toMatchObject({ stageName: 'semifinal' });
    expect(view.rounds.at(-1)!.tables).toHaveLength(2);
    await play(tournament.id, owner.id);
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const final = view.rounds.at(-1)!;
    expect(final).toMatchObject({ stageName: 'final' });
    await play(tournament.id, owner.id);
    expect(
      (await getTournament(db, { tournamentId: tournament.id, userId: owner.id })).nextStep,
    ).toBe('finish');
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.status).toBe('finished');
    expect(view.champion).toBe(final.tables[0]!.entrants[0]);
  });

  it('todos contra todos com 5: 5 rodadas, cada um com um bye, classificação no fim', async () => {
    const { owner, tournament } = await setup(5, 'modern', { structure: 'round_robin', rounds: 2 });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id });
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    // O número de rodadas vem da estrutura (o pedido de 2 é ignorado).
    expect(view.tournament.rounds).toBe(5);
    for (let r = 1; r <= 5; r++) {
      await play(tournament.id, owner.id);
      const step = (await getTournament(db, { tournamentId: tournament.id, userId: owner.id }))
        .nextStep;
      expect(step).toBe(r < 5 ? 'round' : 'finish');
      await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    }
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.status).toBe('finished');
    expect(view.standings.every((s) => s.byes === 1)).toBe(true);
    expect(view.standings.every((s) => s.wins + s.losses + s.byes === 5)).toBe(true);
  });

  it('todos contra todos tem limite de inscrições', async () => {
    const { owner, tournament } = await setup(17, 'modern', { structure: 'round_robin' });
    await expect(
      startTournament(db, { tournamentId: tournament.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('eliminação dupla com 4: as duas chaves, a grande final e o campeão; mesa com a chave', async () => {
    const { owner, tournament } = await setup(4, 'modern', { structure: 'double_elimination' });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.structure).toBe('double_elimination');
    expect(view.rounds[0]!.tables.map((x) => x.bracket)).toEqual(['winners', 'winners']);
    let guard = 0;
    while (view.tournament.status === 'running') {
      guard++;
      expect(guard).toBeLessThan(10);
      await play(tournament.id, owner.id);
      const step = (await getTournament(db, { tournamentId: tournament.id, userId: owner.id }))
        .nextStep;
      const last = view.rounds.at(-1)!;
      expect(step).toBe(last.tables.some((x) => x.bracket === 'final') ? 'finish' : 'round');
      await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
      view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    }
    const brackets = view.rounds.flatMap((r) => r.tables.map((x) => x.bracket));
    expect(brackets).toContain('losers');
    expect(brackets.filter((b) => b === 'final')).toHaveLength(1);
    expect(view.champion).toBeTruthy();
  });
});
