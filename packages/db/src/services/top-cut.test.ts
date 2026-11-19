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
  let seed = 11;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

async function running(size: number, format: string, topCut: number | null, rounds = 3) {
  const { players, owner, group } = await seedGroup(db, size);
  const event = await createEvent(db, {
    groupId: group.id,
    userId: owner.id,
    title: 'Noite do top',
    startsAt: new Date('2026-11-20T22:00:00Z'),
  });
  const tournament = await createTournament(db, {
    eventId: event.id,
    userId: owner.id,
    name: 'Copa com top',
    format,
    rounds,
    topCut,
  });
  for (const p of players)
    await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
  await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
  return { owner, players, tournament };
}

/** Registra todas as mesas abertas da rodada atual: vence o primeiro da mesa (ou empata). */
async function playRound(tournamentId: string, userId: string, draw = false) {
  const view = await getTournament(db, { tournamentId, userId });
  const round = view.rounds.at(-1)!;
  for (const table of round.tables.filter((x) => !x.reported)) {
    const gameWins = draw ? {} : { [table.entrants[0]!]: view.tournament.table === 'pair' ? 2 : 1 };
    await reportTable(db, { tableId: table.id, userId, gameWins, gameDraws: draw ? 1 : 0 });
  }
  return view;
}

describe('top cut', () => {
  it('cria com top só se o tamanho existe para o tipo de mesa', async () => {
    await expect(running(6, 'modern', 10)).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('um contra um, top 4: suíço, semifinais pela classificação, final e campeão', async () => {
    const { owner, tournament } = await running(6, 'modern', 4, 2);
    await playRound(tournament.id, owner.id);
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    await playRound(tournament.id, owner.id);
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.nextStep).toBe('topCut');
    const seeds = view.standings.slice(0, 4).map((s) => s.entrant);

    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const semis = view.rounds.at(-1)!;
    expect(semis).toMatchObject({ stage: 'top', stageName: 'semifinal' });
    expect(semis.tables.map((x) => x.entrants)).toEqual([
      [seeds[0], seeds[3]],
      [seeds[1], seeds[2]],
    ]);
    // A classificação continua sendo a do suíço.
    expect(view.standings.map((s) => s.entrant).slice(0, 4)).toEqual(seeds);

    // No top do um contra um, empate não vale: precisa de um vencedor.
    await expect(
      reportTable(db, {
        tableId: semis.tables[0]!.id,
        userId: owner.id,
        gameWins: { [seeds[0]!]: 1, [seeds[3]!]: 1 },
        gameDraws: 1,
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    // O suíço fica fechado: não dá para corrigir uma mesa dele depois do top começar.
    await expect(
      reportTable(db, {
        tableId: view.rounds[0]!.tables[0]!.id,
        userId: owner.id,
        gameWins: { [view.rounds[0]!.tables[0]!.entrants[1]!]: 2 },
        gameDraws: 0,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });

    await reportTable(db, {
      tableId: semis.tables[0]!.id,
      userId: owner.id,
      gameWins: { [seeds[3]!]: 2 },
      gameDraws: 0,
    });
    await reportTable(db, {
      tableId: semis.tables[1]!.id,
      userId: owner.id,
      gameWins: { [seeds[1]!]: 2 },
      gameDraws: 0,
    });
    expect(
      (await getTournament(db, { tournamentId: tournament.id, userId: owner.id })).nextStep,
    ).toBe('round');
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const final = view.rounds.at(-1)!;
    expect(final).toMatchObject({ stage: 'top', stageName: 'final' });
    expect(final.tables[0]!.entrants).toEqual([seeds[3], seeds[1]]);
    await reportTable(db, {
      tableId: final.tables[0]!.id,
      userId: owner.id,
      gameWins: { [seeds[3]!]: 2 },
      gameDraws: 0,
    });
    expect(
      (await getTournament(db, { tournamentId: tournament.id, userId: owner.id })).nextStep,
    ).toBe('finish');
    expect(await nextRound(db, { tournamentId: tournament.id, userId: owner.id })).toEqual({
      finished: true,
    });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.status).toBe('finished');
    expect(view.champion).toBe(seeds[3]);
    expect(view.timeline.at(-1)).toMatchObject({
      kind: 'finished',
      data: { champions: [seeds[3]] },
    });
  });

  it('pods, top 4: empate na final leva a melhor cabeça de chave', async () => {
    const { owner, tournament } = await running(8, 'commander', 4, 1);
    await playRound(tournament.id, owner.id);
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const seeds = view.standings.slice(0, 4).map((s) => s.entrant);
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.rounds.at(-1)).toMatchObject({ stage: 'top', stageName: 'final' });
    await playRound(tournament.id, owner.id, true);
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.champion).toBe(seeds[0]);
  });

  it('com inscritos de menos para o top, o torneio segue só no suíço', async () => {
    const { owner, tournament } = await running(4, 'modern', 4, 1);
    let view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.topCut).toBeNull();
    await playRound(tournament.id, owner.id);
    expect(
      (await getTournament(db, { tournamentId: tournament.id, userId: owner.id })).nextStep,
    ).toBe('finish');
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.tournament.status).toBe('finished');
    // Sem top, o 1º lugar pode ser dividido: aí não há um campeão único.
    const leaders = view.standings.filter((x) => x.rank === 1);
    expect(view.champion).toBe(leaders.length === 1 ? leaders[0]!.entrant : null);
  });
});
