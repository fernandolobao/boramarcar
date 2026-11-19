import { DomainError, type GamePlayerInput } from '@boramarcar/core';
import { formatRules, isGameFormat } from '@boramarcar/core';
import {
  pairRound,
  recommendedRounds,
  standings,
  tournamentShape,
  type PlayedRound,
} from '@boramarcar/core/tournaments';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../client';
import {
  events,
  games,
  tournamentEntrantMembers,
  tournamentEntrants,
  tournamentEvents,
  tournamentRounds,
  tournamentTables,
  tournaments,
  user,
} from '../schema';
import { recordGame } from './events';
import { addNotifications } from './inbox';
import { requireMembership } from './groups';

/**
 * Torneio suíço do grupo em qualquer formato (9.1). As regras (mesa, emparelhamento,
 * desempates) ficam em `@boramarcar/core/tournaments`; aqui ficam permissões, banco e a ligação
 * com as partidas do grupo.
 */

type TournamentRow = typeof tournaments.$inferSelect;

const view = (row: TournamentRow) => ({ ...row, table: row.tableKind as 'pod' | 'pair' });

async function loadTournament(db: Database, tournamentId: string, userId: string) {
  const [row] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Torneio não encontrado');
  const membership = await requireMembership(db, row.groupId, userId);
  const canManage = membership.role !== 'member' || row.createdBy === userId;
  return { row, membership, canManage };
}

async function requireOrganizer(db: Database, tournamentId: string, userId: string) {
  const loaded = await loadTournament(db, tournamentId, userId);
  if (!loaded.canManage) {
    throw new DomainError('forbidden', 'Só quem organiza o torneio pode fazer isso');
  }
  return loaded;
}

const log = (
  db: Database,
  tournamentId: string,
  kind: string,
  data: Record<string, unknown> = {},
) => db.insert(tournamentEvents).values({ tournamentId, kind, data });

/** Cria o torneio num encontro (dono ou admin do grupo). O formato decide a mesa. */
export async function createTournament(
  db: Database,
  input: {
    eventId: string;
    userId: string;
    name: string;
    format: string;
    bestOf?: 1 | 3;
    points?: { win: number; draw: number; loss: number };
    rounds?: number | null;
    countsInRanking?: boolean;
  },
) {
  const [event] = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
  if (!event) throw new DomainError('not_found', 'Encontro não encontrado');
  const membership = await requireMembership(db, event.groupId, input.userId);
  if (membership.role === 'member') {
    throw new DomainError('forbidden', 'Só o dono ou um admin do grupo cria torneios');
  }
  const name = input.name.trim();
  if (!name || name.length > 120) throw new DomainError('invalid_input', 'Nome inválido');
  if (!isGameFormat(input.format)) throw new DomainError('invalid_input', 'Formato inválido');
  const shape = tournamentShape(input.format);
  // Pods jogam uma partida por rodada; o melhor de 3 é só do um contra um.
  const bestOf = shape.table === 'pod' ? 1 : (input.bestOf ?? shape.bestOf);
  if (bestOf !== 1 && bestOf !== 3) throw new DomainError('invalid_input', 'Melhor de 1 ou de 3');
  const points = input.points ?? { win: 3, draw: 1, loss: 0 };
  if ([points.win, points.draw, points.loss].some((p) => !Number.isInteger(p) || p < 0 || p > 20)) {
    throw new DomainError('invalid_input', 'Pontuação inválida');
  }
  if (
    input.rounds != null &&
    (!Number.isInteger(input.rounds) || input.rounds < 1 || input.rounds > 15)
  ) {
    throw new DomainError('invalid_input', 'Número de rodadas inválido');
  }
  const [row] = await db
    .insert(tournaments)
    .values({
      groupId: event.groupId,
      eventId: event.id,
      name,
      format: input.format,
      tableKind: shape.table,
      entrantSize: shape.entrantSize,
      bestOf,
      pointsWin: points.win,
      pointsDraw: points.draw,
      pointsLoss: points.loss,
      rounds: input.rounds ?? null,
      countsInRanking: input.countsInRanking ?? true,
      createdBy: input.userId,
    })
    .returning();
  return view(row!);
}

/**
 * Inscreve uma pessoa (ou dupla, no 2HG). Quem organiza inscreve qualquer pessoa do grupo; quem
 * não organiza só a si mesmo (e, na dupla, a si e a parceira).
 */
export async function addEntrant(
  db: Database,
  input: { tournamentId: string; userId: string; memberIds: string[] },
) {
  const { row, canManage } = await loadTournament(db, input.tournamentId, input.userId);
  const memberIds = [...new Set(input.memberIds)];
  if (!canManage && !memberIds.includes(input.userId)) {
    throw new DomainError('forbidden', 'Você só pode inscrever a si mesmo');
  }
  if (row.status !== 'registration') throw new DomainError('conflict', 'A inscrição já fechou');
  if (memberIds.length !== row.entrantSize) {
    throw new DomainError(
      'invalid_input',
      row.entrantSize === 2 ? 'Inscreva uma dupla' : 'Inscreva uma pessoa',
    );
  }
  for (const id of memberIds) await requireMembership(db, row.groupId, id);
  const taken = await db
    .select({ userId: tournamentEntrantMembers.userId })
    .from(tournamentEntrantMembers)
    .where(
      and(
        eq(tournamentEntrantMembers.tournamentId, row.id),
        inArray(tournamentEntrantMembers.userId, memberIds),
      ),
    );
  if (taken.length) throw new DomainError('conflict', 'Essa pessoa já está inscrita');
  return db.transaction(async (tx) => {
    const [entrant] = await tx
      .insert(tournamentEntrants)
      .values({ tournamentId: row.id })
      .returning();
    await tx.insert(tournamentEntrantMembers).values(
      memberIds.map((userId, position) => ({
        entrantId: entrant!.id,
        tournamentId: row.id,
        userId,
        position,
      })),
    );
    return entrant!;
  });
}

/** Tira uma inscrição antes de começar (quem organiza, ou quem faz parte dela). */
export async function removeEntrant(
  db: Database,
  input: { tournamentId: string; userId: string; entrantId: string },
) {
  const { row, canManage } = await loadTournament(db, input.tournamentId, input.userId);
  const members = await db
    .select({ userId: tournamentEntrantMembers.userId })
    .from(tournamentEntrantMembers)
    .where(
      and(
        eq(tournamentEntrantMembers.entrantId, input.entrantId),
        eq(tournamentEntrantMembers.tournamentId, row.id),
      ),
    );
  if (!members.length) throw new DomainError('not_found', 'Inscrição não encontrada');
  if (!canManage && !members.some((m) => m.userId === input.userId)) {
    throw new DomainError('forbidden', 'Você só pode tirar a sua inscrição');
  }
  if (row.status !== 'registration') throw new DomainError('conflict', 'A inscrição já fechou');
  await db.delete(tournamentEntrants).where(eq(tournamentEntrants.id, input.entrantId));
}

async function entrantIdsOf(db: Database, tournamentId: string) {
  const rows = await db
    .select({ id: tournamentEntrants.id })
    .from(tournamentEntrants)
    .where(eq(tournamentEntrants.tournamentId, tournamentId))
    .orderBy(asc(tournamentEntrants.createdAt), asc(tournamentEntrants.id));
  return rows.map((r) => r.id);
}

/** Rodadas já jogadas (só mesas com resultado), no formato do núcleo. */
async function playedRounds(db: Database, tournamentId: string): Promise<PlayedRound[]> {
  const rounds = await db
    .select()
    .from(tournamentRounds)
    .where(eq(tournamentRounds.tournamentId, tournamentId))
    .orderBy(asc(tournamentRounds.number));
  const tables = await db
    .select()
    .from(tournamentTables)
    .where(eq(tournamentTables.tournamentId, tournamentId));
  return rounds.map((r) => ({
    tables: tables
      .filter((t) => t.roundId === r.id && t.reportedAt)
      .map((t) => ({ entrants: t.entrantIds, gameWins: t.gameWins ?? {}, gameDraws: t.gameDraws })),
  }));
}

/** Avisa no sino cada pessoa inscrita: a mesa dela na rodada (ou o bye), ou o encerramento. */
async function notifyEntrants(
  db: Database,
  row: TournamentRow,
  event: 'round' | 'finished',
  round: number,
  tableOf: Map<string, number | null> = new Map(),
) {
  const members = await db
    .select({
      entrantId: tournamentEntrantMembers.entrantId,
      userId: tournamentEntrantMembers.userId,
    })
    .from(tournamentEntrantMembers)
    .where(eq(tournamentEntrantMembers.tournamentId, row.id));
  await addNotifications(
    db,
    members.map((m) => ({
      userId: m.userId,
      groupId: row.groupId,
      data: {
        kind: 'tournament' as const,
        tournamentId: row.id,
        event,
        round,
        table: tableOf.get(m.entrantId) ?? null,
      },
    })),
  );
}

async function createRound(
  db: Database,
  row: TournamentRow,
  number: number,
  random?: () => number,
) {
  const entrants = await entrantIdsOf(db, row.id);
  const played = await playedRounds(db, row.id);
  const tables = pairRound(entrants, played, { table: row.tableKind as 'pod' | 'pair', random });
  await db.transaction(async (tx) => {
    const [round] = await tx
      .insert(tournamentRounds)
      .values({ tournamentId: row.id, number })
      .returning();
    await tx.insert(tournamentTables).values(
      tables.map((entrantIds, i) => ({
        roundId: round!.id,
        tournamentId: row.id,
        number: i + 1,
        entrantIds,
        // O bye já nasce registrado (vale vitória).
        ...(entrantIds.length === 1 ? { gameWins: {}, reportedAt: new Date() } : {}),
      })),
    );
  });
  await log(db, row.id, 'round_started', { round: number, tables: tables.length });
  const tableOf = new Map<string, number | null>();
  tables.forEach((entrantIds, i) => {
    for (const e of entrantIds) tableOf.set(e, entrantIds.length === 1 ? null : i + 1);
  });
  await notifyEntrants(db, row, 'round', number, tableOf);
}

/** Fecha a inscrição e sorteia a 1ª rodada (quem organiza; 2 inscrições ou mais). */
export async function startTournament(
  db: Database,
  input: { tournamentId: string; userId: string; random?: () => number },
) {
  const { row } = await requireOrganizer(db, input.tournamentId, input.userId);
  if (row.status !== 'registration') throw new DomainError('conflict', 'O torneio já começou');
  const entrants = await entrantIdsOf(db, row.id);
  if (entrants.length < 2) throw new DomainError('invalid_input', 'Inscreva ao menos 2');
  const rounds = row.rounds ?? recommendedRounds(entrants.length, row.tableKind as 'pod' | 'pair');
  const [running] = await db
    .update(tournaments)
    .set({ status: 'running', rounds })
    .where(eq(tournaments.id, row.id))
    .returning();
  await log(db, row.id, 'started', { entrants: entrants.length, rounds });
  await createRound(db, running!, 1, input.random);
}

/** Valida o placar da mesa: pod = um vencedor ou empate; par = até o melhor de N. */
function checkResult(
  row: TournamentRow,
  entrants: readonly string[],
  gameWins: Record<string, number>,
  gameDraws: number,
) {
  const bad = () => new DomainError('invalid_input', 'Resultado inválido para esta mesa');
  const keys = Object.keys(gameWins);
  if (keys.some((k) => !entrants.includes(k))) throw bad();
  const values = Object.values(gameWins);
  if ([...values, gameDraws].some((v) => !Number.isInteger(v) || v < 0)) throw bad();
  const total = values.reduce((s, v) => s + v, 0) + gameDraws;
  if (row.tableKind === 'pod') {
    const winners = values.filter((v) => v > 0);
    const ok =
      (winners.length === 1 && winners[0] === 1 && gameDraws === 0) ||
      (total === 1 && gameDraws === 1);
    if (!ok) throw bad();
    return;
  }
  const needed = Math.ceil(row.bestOf / 2);
  if (total < 1 || total > row.bestOf || values.some((v) => v > needed)) throw bad();
}

/** Partidas do grupo a partir do resultado da mesa (uma no pod; uma por jogo no par). */
function gamesFor(
  row: TournamentRow,
  entrants: readonly string[],
  members: Map<string, string[]>,
  gameWins: Record<string, number>,
  gameDraws: number,
): GamePlayerInput[][] {
  const teams = formatRules(row.format).structure === 'teams';
  const playersFor = (winner: string | null): GamePlayerInput[] =>
    entrants.flatMap((entrant, i) =>
      (members.get(entrant) ?? []).map((userId) => ({
        userId,
        result: winner === null ? 'draw' : entrant === winner ? 'win' : 'loss',
        team: teams ? i + 1 : null,
      })),
    );
  if (row.tableKind === 'pod') {
    const winner = entrants.find((e) => (gameWins[e] ?? 0) > 0) ?? null;
    return [playersFor(winner).map((p, i) => ({ ...p, seat: i + 1 }))];
  }
  const list: GamePlayerInput[][] = [];
  for (const entrant of entrants)
    for (let g = 0; g < (gameWins[entrant] ?? 0); g++) list.push(playersFor(entrant));
  for (let g = 0; g < gameDraws; g++) list.push(playersFor(null));
  return list;
}

/**
 * Registra o resultado da mesa: quem está nela (enquanto não tem resultado) ou quem organiza
 * (também para corrigir). Vale na hora; se o torneio conta no ranking, os jogos viram partidas do
 * grupo (refeitas numa correção).
 */
export async function reportTable(
  db: Database,
  input: {
    tableId: string;
    userId: string;
    gameWins: Record<string, number>;
    gameDraws: number;
    /** Da URL: a mesa precisa ser deste torneio. */
    tournamentId?: string;
  },
) {
  const [table] = await db
    .select()
    .from(tournamentTables)
    .where(eq(tournamentTables.id, input.tableId))
    .limit(1);
  if (!table || (input.tournamentId && table.tournamentId !== input.tournamentId)) {
    throw new DomainError('not_found', 'Mesa não encontrada');
  }
  const { row, canManage } = await loadTournament(db, table.tournamentId, input.userId);
  if (table.entrantIds.length < 2)
    throw new DomainError('conflict', 'Mesa de bye não tem resultado');
  const memberRows = await db
    .select()
    .from(tournamentEntrantMembers)
    .where(inArray(tournamentEntrantMembers.entrantId, table.entrantIds))
    .orderBy(asc(tournamentEntrantMembers.position));
  const members = new Map<string, string[]>();
  for (const m of memberRows)
    members.set(m.entrantId, [...(members.get(m.entrantId) ?? []), m.userId]);
  const atTable = memberRows.some((m) => m.userId === input.userId);
  if (!canManage && (!atTable || table.reportedAt)) {
    throw new DomainError(
      'forbidden',
      table.reportedAt
        ? 'Só quem organiza corrige um resultado'
        : 'Só quem está na mesa ou organiza registra o resultado',
    );
  }
  const gameWins = Object.fromEntries(
    Object.entries(input.gameWins).filter(([, v]) => v !== 0),
  ) as Record<string, number>;
  if (row.status !== 'running') throw new DomainError('conflict', 'O torneio não está rodando');
  checkResult(row, table.entrantIds, gameWins, input.gameDraws);

  // Correção: as partidas antigas desta mesa saem antes das novas.
  if (table.gameIds.length) await db.delete(games).where(inArray(games.id, table.gameIds));
  const gameIds: string[] = [];
  if (row.countsInRanking) {
    for (const players of gamesFor(row, table.entrantIds, members, gameWins, input.gameDraws)) {
      const game = await recordGame(db, {
        eventId: row.eventId,
        userId: input.userId,
        format: isGameFormat(row.format) ? row.format : undefined,
        players,
      });
      gameIds.push(game.id);
    }
  }
  await db
    .update(tournamentTables)
    .set({
      gameWins,
      gameDraws: input.gameDraws,
      gameIds,
      reportedBy: input.userId,
      reportedAt: new Date(),
    })
    .where(eq(tournamentTables.id, table.id));
  const [round] = await db
    .select({ number: tournamentRounds.number })
    .from(tournamentRounds)
    .where(eq(tournamentRounds.id, table.roundId));
  await log(db, row.id, 'table_reported', {
    round: round?.number,
    table: table.number,
    gameWins,
    gameDraws: input.gameDraws,
    corrected: Boolean(table.reportedAt),
  });
}

/**
 * Próxima rodada (quem organiza), quando todas as mesas da atual têm resultado. Depois da última,
 * encerra o torneio.
 */
export async function nextRound(
  db: Database,
  input: { tournamentId: string; userId: string; random?: () => number },
) {
  const { row } = await requireOrganizer(db, input.tournamentId, input.userId);
  if (row.status !== 'running') throw new DomainError('conflict', 'O torneio não está rodando');
  const [current] = await db
    .select()
    .from(tournamentRounds)
    .where(eq(tournamentRounds.tournamentId, row.id))
    .orderBy(desc(tournamentRounds.number))
    .limit(1);
  const tables = await db
    .select({ reportedAt: tournamentTables.reportedAt })
    .from(tournamentTables)
    .where(eq(tournamentTables.roundId, current!.id));
  if (tables.some((t) => !t.reportedAt)) {
    throw new DomainError('conflict', 'Ainda há mesas sem resultado nesta rodada');
  }
  if (current!.number >= (row.rounds ?? 0)) {
    await db.update(tournaments).set({ status: 'finished' }).where(eq(tournaments.id, row.id));
    const table = standings(await entrantIdsOf(db, row.id), await playedRounds(db, row.id), {
      win: row.pointsWin,
      draw: row.pointsDraw,
      loss: row.pointsLoss,
    });
    await log(db, row.id, 'finished', {
      champions: table.filter((s) => s.rank === 1).map((s) => s.entrant),
    });
    await notifyEntrants(db, row, 'finished', current!.number);
    return { finished: true as const };
  }
  await createRound(db, row, current!.number + 1, input.random);
  return { finished: false as const };
}

/** Página do torneio: inscrições, rodadas e mesas, classificação e linha do tempo. */
export async function getTournament(db: Database, input: { tournamentId: string; userId: string }) {
  const { row, canManage } = await loadTournament(db, input.tournamentId, input.userId);
  const [entrantRows, memberRows, rounds, tables, timeline, [event]] = await Promise.all([
    entrantIdsOf(db, row.id),
    db
      .select({
        entrantId: tournamentEntrantMembers.entrantId,
        userId: tournamentEntrantMembers.userId,
        name: user.name,
      })
      .from(tournamentEntrantMembers)
      .innerJoin(user, eq(user.id, tournamentEntrantMembers.userId))
      .where(eq(tournamentEntrantMembers.tournamentId, row.id))
      .orderBy(asc(tournamentEntrantMembers.position)),
    db
      .select()
      .from(tournamentRounds)
      .where(eq(tournamentRounds.tournamentId, row.id))
      .orderBy(asc(tournamentRounds.number)),
    db
      .select()
      .from(tournamentTables)
      .where(eq(tournamentTables.tournamentId, row.id))
      .orderBy(asc(tournamentTables.number)),
    db
      .select({
        kind: tournamentEvents.kind,
        data: tournamentEvents.data,
        createdAt: tournamentEvents.createdAt,
      })
      .from(tournamentEvents)
      .where(eq(tournamentEvents.tournamentId, row.id))
      .orderBy(asc(tournamentEvents.createdAt)),
    db
      .select({ title: events.title, startsAt: events.startsAt })
      .from(events)
      .where(eq(events.id, row.eventId)),
  ]);
  const entrants = entrantRows.map((id) => {
    const members = memberRows.filter((m) => m.entrantId === id);
    return {
      id,
      memberIds: members.map((m) => m.userId),
      name: members.map((m) => m.name).join(' & '),
    };
  });
  const mine = entrants.find((e) => e.memberIds.includes(input.userId))?.id ?? null;
  const played: PlayedRound[] = rounds.map((r) => ({
    tables: tables
      .filter((t) => t.roundId === r.id && t.reportedAt)
      .map((t) => ({ entrants: t.entrantIds, gameWins: t.gameWins ?? {}, gameDraws: t.gameDraws })),
  }));
  return {
    tournament: view(row),
    event: event ?? null,
    canManage,
    myEntrantId: mine,
    entrants,
    rounds: rounds.map((r) => ({
      id: r.id,
      number: r.number,
      tables: tables
        .filter((t) => t.roundId === r.id)
        .map((t) => ({
          id: t.id,
          number: t.number,
          entrants: t.entrantIds,
          gameWins: t.gameWins ?? {},
          gameDraws: t.gameDraws,
          reported: Boolean(t.reportedAt),
        })),
    })),
    standings: standings(entrantRows, played, {
      win: row.pointsWin,
      draw: row.pointsDraw,
      loss: row.pointsLoss,
    }),
    timeline,
  };
}
export type TournamentView = Awaited<ReturnType<typeof getTournament>>;

/** Torneios do grupo, mais novos primeiro. */
export async function listTournaments(db: Database, input: { groupId: string; userId: string }) {
  await requireMembership(db, input.groupId, input.userId);
  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      format: tournaments.format,
      status: tournaments.status,
      eventId: tournaments.eventId,
      createdAt: tournaments.createdAt,
    })
    .from(tournaments)
    .where(eq(tournaments.groupId, input.groupId))
    .orderBy(desc(tournaments.createdAt));
  if (!rows.length) return [];
  const counts = await db
    .select({ tournamentId: tournamentEntrants.tournamentId, n: count() })
    .from(tournamentEntrants)
    .where(
      inArray(
        tournamentEntrants.tournamentId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(tournamentEntrants.tournamentId);
  const countOf = new Map(counts.map((c) => [c.tournamentId, Number(c.n)]));
  return rows.map((r) => ({ ...r, entrants: countOf.get(r.id) ?? 0 }));
}

/** Apaga o torneio (quem organiza). As partidas já registradas continuam no grupo. */
export async function deleteTournament(
  db: Database,
  input: { tournamentId: string; userId: string },
) {
  const { row } = await requireOrganizer(db, input.tournamentId, input.userId);
  await db.delete(tournaments).where(eq(tournaments.id, row.id));
}
