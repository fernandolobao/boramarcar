import { formatRules, type GameFormat, type GamePlayerInput } from '../games';

/**
 * Modo mesa (5.6): contador de vida no estilo dos apps de mesa (Lotus) e o resultado da partida.
 * Estado puro e imutável, com histórico para desfazer; a interface só despacha ações.
 */

export const TABLE_COUNTERS = ['poison', 'energy', 'experience', 'tax'] as const;
export type TableCounter = (typeof TABLE_COUNTERS)[number];

export interface TablePlayer {
  userId: string;
  name: string;
  deckId: string | null;
  life: number;
  counters: Record<TableCounter, number>;
  /** Dano de comandante recebido, por jogador de origem. */
  commanderDamage: Record<string, number>;
  conceded: boolean;
  /** Passo do histórico em que caiu (para a ordem de eliminação); `null` = na mesa. */
  defeatedAt: number | null;
}

export interface TableState {
  format: GameFormat;
  startingLife: number;
  players: TablePlayer[];
  firstPlayerId: string | null;
  monarchId: string | null;
  startedAt: string;
  /** Contador de ações (cada ação conta um passo). */
  step: number;
  /** Estados anteriores para desfazer (os últimos 100). */
  undo: Omit<TableState, 'undo'>[];
}

export type TableAction =
  | { type: 'life'; userId: string; delta: number }
  | { type: 'counter'; userId: string; counter: TableCounter; delta: number }
  | { type: 'commander'; userId: string; fromUserId: string; delta: number }
  | { type: 'concede'; userId: string; conceded: boolean }
  | { type: 'monarch'; userId: string | null }
  | { type: 'first'; userId: string | null }
  | { type: 'undo' };

/** Vida inicial por formato: 40 em Commander e Brawl, 20 nos demais. */
export function startingLifeFor(format: GameFormat): number {
  return format === 'commander' || format === 'brawl' ? 40 : 20;
}

/** Partidas que o modo mesa cobre: todos contra todos e duelo (times usam o formulário). */
export const tableSupportsFormat = (format: GameFormat) =>
  formatRules(format).structure !== 'teams';

export function createTable(input: {
  format: GameFormat;
  players: readonly { userId: string; name: string; deckId?: string | null }[];
  startingLife?: number;
  now?: Date;
}): TableState {
  const life = input.startingLife ?? startingLifeFor(input.format);
  return {
    format: input.format,
    startingLife: life,
    players: input.players.map((p) => ({
      userId: p.userId,
      name: p.name,
      deckId: p.deckId ?? null,
      life,
      counters: { poison: 0, energy: 0, experience: 0, tax: 0 },
      commanderDamage: {},
      conceded: false,
      defeatedAt: null,
    })),
    firstPlayerId: null,
    monarchId: null,
    startedAt: (input.now ?? new Date()).toISOString(),
    step: 0,
    undo: [],
  };
}

/** Motivo da derrota, se houver: vida, veneno (10), dano de comandante (21) ou concessão. */
export function defeatReason(
  player: TablePlayer,
  format: GameFormat,
): 'life' | 'poison' | 'commander' | 'conceded' | null {
  if (player.conceded) return 'conceded';
  if (player.life <= 0) return 'life';
  if (player.counters.poison >= 10) return 'poison';
  if (
    formatRules(format).usesCommander &&
    Object.values(player.commanderDamage).some((d) => d >= 21)
  ) {
    return 'commander';
  }
  return null;
}

const MAX_UNDO = 100;

function withDefeats(state: TableState): TableState {
  return {
    ...state,
    players: state.players.map((p) => {
      const down = defeatReason(p, state.format) !== null;
      if (down && p.defeatedAt === null) return { ...p, defeatedAt: state.step };
      if (!down && p.defeatedAt !== null) return { ...p, defeatedAt: null };
      return p;
    }),
  };
}

const updatePlayer = (state: TableState, userId: string, fn: (p: TablePlayer) => TablePlayer) => ({
  ...state,
  players: state.players.map((p) => (p.userId === userId ? fn(p) : p)),
});

export function tableReducer(state: TableState, action: TableAction): TableState {
  if (action.type === 'undo') {
    const previous = state.undo.at(-1);
    return previous ? { ...previous, undo: state.undo.slice(0, -1) } : state;
  }
  const { undo, ...snapshot } = state;
  const base: TableState = {
    ...state,
    step: state.step + 1,
    undo: [...undo, snapshot].slice(-MAX_UNDO),
  };
  switch (action.type) {
    case 'life':
      return withDefeats(
        updatePlayer(base, action.userId, (p) => ({ ...p, life: p.life + action.delta })),
      );
    case 'counter':
      return withDefeats(
        updatePlayer(base, action.userId, (p) => ({
          ...p,
          counters: {
            ...p.counters,
            [action.counter]: Math.max(0, p.counters[action.counter] + action.delta),
          },
        })),
      );
    case 'commander':
      return withDefeats(
        updatePlayer(base, action.userId, (p) => {
          const current = p.commanderDamage[action.fromUserId] ?? 0;
          const next = Math.max(0, current + action.delta);
          // Dano de comandante também é perda de vida (e "desfazer" devolve a vida).
          return {
            ...p,
            life: p.life - (next - current),
            commanderDamage: { ...p.commanderDamage, [action.fromUserId]: next },
          };
        }),
      );
    case 'concede':
      return withDefeats(
        updatePlayer(base, action.userId, (p) => ({ ...p, conceded: action.conceded })),
      );
    case 'monarch':
      return { ...base, monarchId: action.userId };
    case 'first':
      return { ...base, firstPlayerId: action.userId };
  }
}

/** Jogadores ainda na mesa. */
export const alivePlayers = (state: TableState) =>
  state.players.filter((p) => defeatReason(p, state.format) === null);

/**
 * Resultado sugerido: quem caiu primeiro tem ordem de eliminação 1; se sobra um só, ele vence.
 * Com mais de um vivo, o resultado fica em aberto (a pessoa escolhe o vencedor ou empate).
 */
export function tableResult(state: TableState): {
  winnerId: string | null;
  eliminated: { userId: string; order: number }[];
} {
  const fallen = state.players
    .filter((p) => p.defeatedAt !== null)
    .sort((a, b) => a.defeatedAt! - b.defeatedAt!);
  const alive = alivePlayers(state);
  return {
    winnerId: alive.length === 1 ? alive[0]!.userId : null,
    eliminated: fallen.map((p, i) => ({ userId: p.userId, order: i + 1 })),
  };
}

/** Jogadores para registrar a partida (`winnerId` null = empate entre todos). */
export function tableGamePlayers(state: TableState, winnerId: string | null): GamePlayerInput[] {
  const { eliminated } = tableResult(state);
  const order = new Map(eliminated.map((e) => [e.userId, e.order]));
  return state.players.map((p, i) => ({
    userId: p.userId,
    deckId: p.deckId,
    seat: i + 1,
    result: winnerId === null ? 'draw' : p.userId === winnerId ? 'win' : 'loss',
    eliminatedOrder:
      winnerId !== null && p.userId !== winnerId ? (order.get(p.userId) ?? null) : null,
  }));
}

/** Duração em minutos (mínimo 1) desde o início da mesa. */
export const tableDurationMinutes = (state: TableState, now = new Date()) =>
  Math.max(1, Math.round((now.getTime() - new Date(state.startedAt).getTime()) / 60000));

/** Sorteio (dados, moeda, quem começa) com fonte de aleatoriedade injetável para testes. */
export const rollDie = (sides: number, random: () => number = Math.random) =>
  1 + Math.floor(random() * sides);
