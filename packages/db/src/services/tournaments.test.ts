import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { gamePlayers, games } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent } from './events';
import { listNotifications } from './inbox';
import {
  addEntrant,
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  nextRound,
  removeEntrant,
  reportTable,
  startTournament,
} from './tournaments';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

/** Sorteio previsível. */
const fixed = () => {
  let seed = 7;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

async function setup(size: number, format: string, extra: Record<string, unknown> = {}) {
  const { group, players, owner } = await seedGroup(db, size);
  const event = await createEvent(db, {
    groupId: group.id,
    userId: owner.id,
    title: 'Noite do torneio',
    startsAt: new Date('2026-11-20T22:00:00Z'),
  });
  const tournament = await createTournament(db, {
    eventId: event.id,
    userId: owner.id,
    name: 'Torneio de novembro',
    format,
    ...extra,
  });
  return { group, players, owner, event, tournament };
}

const gamesOfEvent = (eventId: string) => db.select().from(games).where(eq(games.eventId, eventId));

describe('torneio em pods (Commander)', () => {
  it('inscreve, sorteia os pods, registra pela mesa, vira partida do grupo e fecha a rodada', async () => {
    const { players, owner, event, tournament } = await setup(8, 'commander');
    expect(tournament).toMatchObject({ table: 'pod', bestOf: 1, status: 'registration' });
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    // Quem não organiza não começa o torneio.
    await expect(
      startTournament(db, { tournamentId: tournament.id, userId: players[3]!.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });

    let view = await getTournament(db, { tournamentId: tournament.id, userId: players[5]!.id });
    expect(view.tournament.status).toBe('running');
    expect(view.rounds).toHaveLength(1);
    const [t1, t2] = view.rounds[0]!.tables;
    expect([t1!.entrants.length, t2!.entrants.length]).toEqual([4, 4]);

    // Alguém que não está na mesa (nem organiza) não registra o resultado dela.
    const outsider = view.entrants.find(
      (e) => !t1!.entrants.includes(e.id) && !e.memberIds.includes(owner.id),
    )!;
    await expect(
      reportTable(db, {
        tableId: t1!.id,
        userId: outsider.memberIds[0]!,
        gameWins: { [t1!.entrants[0]!]: 1 },
        gameDraws: 0,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    // Quem está na mesa registra: vencedor + o resto perde; vira uma partida do grupo.
    const atTable = view.entrants.find((e) => e.id === t1!.entrants[1])!;
    await reportTable(db, {
      tableId: t1!.id,
      userId: atTable.memberIds[0]!,
      gameWins: { [t1!.entrants[0]!]: 1 },
      gameDraws: 0,
    });
    const recorded = await gamesOfEvent(event.id);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.format).toBe('commander');
    const result = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, recorded[0]!.id));
    expect(result.filter((r) => r.result === 'win')).toHaveLength(1);
    expect(result).toHaveLength(4);

    // A próxima rodada só sai com todas as mesas registradas.
    await expect(
      nextRound(db, { tournamentId: tournament.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await reportTable(db, {
      tableId: t2!.id,
      userId: owner.id,
      gameWins: {},
      gameDraws: 1,
    });
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.rounds).toHaveLength(2);
    expect(view.standings[0]).toMatchObject({ points: 3, rank: 1 });
    expect(view.timeline.map((e) => e.kind)).toEqual(
      expect.arrayContaining(['started', 'round_started', 'table_reported']),
    );
  });
});

describe('torneio um contra um (Modern, melhor de 3)', () => {
  it('ímpar dá bye; o placar em jogos vira partidas; o organizador corrige', async () => {
    const { players, owner, event, tournament } = await setup(3, 'modern', { rounds: 3 });
    expect(tournament).toMatchObject({ table: 'pair', bestOf: 3 });
    // Cada pessoa pode se inscrever sozinha.
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: p.id, memberIds: [p.id] });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const tables = view.rounds[0]!.tables;
    const bye = tables.find((t) => t.entrants.length === 1)!;
    expect(bye.reported).toBe(true);
    const match = tables.find((t) => t.entrants.length === 2)!;
    const [a, b] = match.entrants as [string, string];

    // Placar impossível no melhor de 3.
    await expect(
      reportTable(db, { tableId: match.id, userId: owner.id, gameWins: { [a]: 3 }, gameDraws: 0 }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    await reportTable(db, {
      tableId: match.id,
      userId: owner.id,
      gameWins: { [a]: 2, [b]: 1 },
      gameDraws: 0,
    });
    expect(await gamesOfEvent(event.id)).toHaveLength(3);
    // Correção do organizador: refaz as partidas.
    await reportTable(db, {
      tableId: match.id,
      userId: owner.id,
      gameWins: { [a]: 2, [b]: 0 },
      gameDraws: 0,
    });
    expect(await gamesOfEvent(event.id)).toHaveLength(2);
    const after = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(after.standings.find((s) => s.entrant === a)).toMatchObject({ points: 3, wins: 1 });
    expect(after.standings.find((s) => s.entrant === bye.entrants[0])).toMatchObject({
      points: 3,
      byes: 1,
    });
  });

  it('sem contar no ranking, nenhuma partida é criada', async () => {
    const { players, owner, event, tournament } = await setup(2, 'pauper', {
      countsInRanking: false,
      bestOf: 1,
    });
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const [t] = view.rounds[0]!.tables;
    await reportTable(db, {
      tableId: t!.id,
      userId: owner.id,
      gameWins: { [t!.entrants[0]!]: 1 },
      gameDraws: 0,
    });
    expect(await gamesOfEvent(event.id)).toHaveLength(0);
  });
});

describe('torneio de duplas (2HG)', () => {
  it('cada inscrição é uma dupla; a mesa vira uma partida de times', async () => {
    const { players, owner, event, tournament } = await setup(4, 'two_headed_giant', {
      bestOf: 1,
    });
    const [p1, p2, p3, p4] = players as [
      (typeof players)[0],
      (typeof players)[0],
      (typeof players)[0],
      (typeof players)[0],
    ];
    // Dupla incompleta não entra.
    await expect(
      addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p1.id] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await addEntrant(db, {
      tournamentId: tournament.id,
      userId: owner.id,
      memberIds: [p1.id, p2.id],
    });
    // A mesma pessoa não entra em duas duplas.
    await expect(
      addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p2.id, p3.id] }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await addEntrant(db, {
      tournamentId: tournament.id,
      userId: owner.id,
      memberIds: [p3.id, p4.id],
    });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.entrants.map((e) => e.name).sort()).toEqual(['P1 & P2', 'P3 & P4']);
    const [t] = view.rounds[0]!.tables;
    await reportTable(db, {
      tableId: t!.id,
      userId: p3.id,
      gameWins: { [t!.entrants[0]!]: 1 },
      gameDraws: 0,
    });
    const [game] = await gamesOfEvent(event.id);
    const seats = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game!.id));
    expect(seats).toHaveLength(4);
    expect(new Set(seats.map((s) => s.team))).toEqual(new Set([1, 2]));
  });
});

describe('acesso e ciclo de vida', () => {
  it('só quem é do grupo vê; só dono/admin cria; inscrição some antes de começar; fim após as rodadas', async () => {
    const { players, owner, tournament, group } = await setup(2, 'standard', {
      rounds: 1,
      bestOf: 1,
    });
    const stranger = await createTestUser(db);
    await expect(
      getTournament(db, { tournamentId: tournament.id, userId: stranger.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(
      (await listTournaments(db, { groupId: group.id, userId: players[1]!.id })).map((t) => t.id),
    ).toContain(tournament.id);

    const entrant = await addEntrant(db, {
      tournamentId: tournament.id,
      userId: players[1]!.id,
      memberIds: [players[1]!.id],
    });
    await removeEntrant(db, {
      tournamentId: tournament.id,
      userId: players[1]!.id,
      entrantId: entrant.id,
    });
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    // Começou: a inscrição fecha.
    await expect(
      addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [owner.id] }),
    ).rejects.toMatchObject({ code: 'conflict' });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const [t] = view.rounds[0]!.tables;
    await reportTable(db, {
      tableId: t!.id,
      userId: owner.id,
      gameWins: { [t!.entrants[0]!]: 1 },
      gameDraws: 0,
    });
    // Era a última rodada: "próxima" encerra o torneio.
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    const done = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(done.tournament.status).toBe('finished');
    expect(done.timeline.at(-1)!.kind).toBe('finished');

    const other = await setup(2, 'commander');
    await expect(
      createTournament(db, {
        eventId: other.event.id,
        userId: other.players[1]!.id,
        name: 'Meu',
        format: 'commander',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await deleteTournament(db, { tournamentId: other.tournament.id, userId: other.owner.id });
    expect(await listTournaments(db, { groupId: other.group.id, userId: other.owner.id })).toEqual(
      [],
    );
  });
});

describe('avisos do torneio no sino', () => {
  it('a cada rodada, cada pessoa recebe a sua mesa (ou o bye); no fim, o encerramento', async () => {
    const { players, owner, tournament } = await setup(3, 'pauper', { rounds: 1, bestOf: 1 });
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const tables = view.rounds[0]!.tables;
    for (const p of players) {
      const entrant = view.entrants.find((e) => e.memberIds.includes(p.id))!;
      const table = tables.find((t) => t.entrants.includes(entrant.id))!;
      const inbox = await listNotifications(db, { userId: p.id });
      expect(inbox).toEqual([
        expect.objectContaining({
          kind: 'tournament',
          tournamentName: 'Torneio de novembro',
          data: {
            kind: 'tournament',
            tournamentId: tournament.id,
            event: 'round',
            round: 1,
            table: table.entrants.length === 1 ? null : table.number,
          },
        }),
      ]);
    }
    const match = tables.find((t) => t.entrants.length === 2)!;
    await reportTable(db, {
      tableId: match.id,
      userId: owner.id,
      gameWins: { [match.entrants[0]!]: 1 },
      gameDraws: 0,
    });
    await nextRound(db, { tournamentId: tournament.id, userId: owner.id });
    const last = (await listNotifications(db, { userId: players[1]!.id }))[0]!;
    expect(last.data).toMatchObject({ kind: 'tournament', event: 'finished' });
  });
});

describe('resultado vindo do modo mesa', () => {
  it('os detalhes da partida (quem começou, turno e duração) vão para a partida do grupo', async () => {
    const { players, owner, event, tournament } = await setup(4, 'commander');
    for (const p of players)
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    const [t] = view.rounds[0]!.tables;
    const first = view.entrants.find((e) => e.id === t!.entrants[1])!.memberIds[0]!;
    await reportTable(db, {
      tableId: t!.id,
      userId: owner.id,
      gameWins: { [t!.entrants[0]!]: 1 },
      gameDraws: 0,
      details: { firstPlayerId: first, winningTurn: 7, durationMinutes: 52 },
    });
    const [game] = await gamesOfEvent(event.id);
    expect(game).toMatchObject({ firstPlayerId: first, winningTurn: 7, durationMinutes: 52 });
  });

  it('clique duplo em "Começar": uma largada só, e o outro pedido é "já começou"', async () => {
    const { players, owner, tournament } = await setup(4, 'modern');
    for (const p of players) {
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [p.id] });
    }
    const settled = await Promise.allSettled([
      startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() }),
      startTournament(db, { tournamentId: tournament.id, userId: owner.id, random: fixed() }),
    ]);
    expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (settled.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ code: 'conflict' });
    const view = await getTournament(db, { tournamentId: tournament.id, userId: owner.id });
    expect(view.rounds).toHaveLength(1);
    expect(view.timeline.filter((e) => e.kind === 'started')).toHaveLength(1);
  });
});
