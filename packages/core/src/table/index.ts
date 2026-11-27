import { formatRules, type GameFormat, type GamePlayerInput } from '../games';
import { SEAT_COLORS, TABLE_COLORS, type SeatRotation } from './layout';

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
  /**
   * Dano de comandante recebido, por comandante de origem: a chave é o id de quem atacou e, para
   * o segundo comandante (parceiros), `id#2` (ver `commanderDamageKey`).
   */
  commanderDamage: Record<string, number>;
  /** Nomes dos comandantes do deck escolhido (vazio quando não se sabe). */
  commanders?: string[];
  /** Quantos comandantes o jogador tem (2 com parceiros); sem valor, o que o deck diz ou 1. */
  commanderCount?: 1 | 2;
  conceded: boolean;
  /** Morreu por outro motivo (deck vazio, efeito de carta…); vida, veneno e comandante contam sozinhos. */
  died?: boolean;
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
  /** Disposição escolhida (`tableLayouts`); sem valor, a padrão para o número de jogadores. */
  layoutId?: string | null;
  /** Giro individual por posição na mesa, por cima da disposição. */
  rotations?: Record<number, SeatRotation>;
  /** Cor escolhida por jogador (id → cor de `TABLE_COLORS`); sem valor, a da posição. */
  colors?: Record<string, string>;
}

export type TableAction =
  | { type: 'life'; userId: string; delta: number }
  | { type: 'counter'; userId: string; counter: TableCounter; delta: number }
  /** Dano de comandante: `index` 1 é o segundo comandante de quem atacou (parceiros). */
  | { type: 'commander'; userId: string; fromUserId: string; index?: 0 | 1; delta: number }
  /** Quantos comandantes o jogador tem (para quem não escolheu deck com dois). */
  | { type: 'commanders'; userId: string; count: 1 | 2 }
  | { type: 'concede'; userId: string; conceded: boolean }
  /** Morreu por outro motivo que o contador não vê (deck vazio, efeito de carta). */
  | { type: 'died'; userId: string; died: boolean }
  | { type: 'monarch'; userId: string | null }
  | { type: 'first'; userId: string | null }
  /** Troca dois jogadores de lugar na mesa (as áreas acompanham onde cada um está sentado). */
  | { type: 'swap'; userId: string; withUserId: string }
  /** Muda a disposição das áreas (zera os giros individuais). Não entra no "desfazer". */
  | { type: 'layout'; layoutId: string }
  /** Gira a área de uma posição da mesa. Não entra no "desfazer". */
  | { type: 'rotate'; seat: number; rotate: SeatRotation }
  /** Cor da área do jogador (`null` = a padrão da posição). Não entra no "desfazer". */
  | { type: 'color'; userId: string; color: string | null }
  | { type: 'undo' };

/** Vida inicial por formato: 40 em Commander e Brawl, 20 nos demais. */
export function startingLifeFor(format: GameFormat): number {
  return format === 'commander' || format === 'brawl' ? 40 : 20;
}

/** Partidas que o modo mesa cobre: todos contra todos e duelo (times usam o formulário). */
export const tableSupportsFormat = (format: GameFormat) =>
  formatRules(format).structure !== 'teams';

/** Chave do dano de comandante: o primeiro comandante usa o id; o segundo, `id#2`. */
export const commanderDamageKey = (fromUserId: string, index: 0 | 1 = 0) =>
  index === 1 ? `${fromUserId}#2` : fromUserId;

/** Quantos comandantes o jogador tem: o escolhido na mesa, senão o que o deck diz. */
export const commanderCountOf = (player: TablePlayer): 1 | 2 =>
  player.commanderCount ?? ((player.commanders?.length ?? 0) >= 2 ? 2 : 1);

/**
 * Fontes de dano de comandante para quem recebe: cada comandante de cada oponente, com o nome
 * do comandante quando o deck diz (para a linha "De Ana — Thrasios").
 */
export function commanderSources(state: TableState, userId: string) {
  return state.players
    .filter((p) => p.userId !== userId)
    .flatMap((p) =>
      ([0, 1] as const).slice(0, commanderCountOf(p)).map((index) => ({
        key: commanderDamageKey(p.userId, index),
        fromUserId: p.userId,
        index,
        name: p.name,
        commander: p.commanders?.[index] ?? null,
      })),
    );
}

export function createTable(input: {
  format: GameFormat;
  players: readonly {
    userId: string;
    name: string;
    deckId?: string | null;
    /** Comandantes do deck (nomes), para separar o dano de parceiros. */
    commanders?: readonly string[];
  }[];
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
      commanders: [...(p.commanders ?? [])].slice(0, 2),
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
): 'life' | 'poison' | 'commander' | 'conceded' | 'died' | null {
  if (player.conceded) return 'conceded';
  if (player.died) return 'died';
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
    // A disposição é da tela, não da partida: desfazer não a muda.
    return previous
      ? {
          ...previous,
          layoutId: state.layoutId,
          rotations: state.rotations,
          colors: state.colors,
          undo: state.undo.slice(0, -1),
        }
      : state;
  }
  if (action.type === 'layout') return { ...state, layoutId: action.layoutId, rotations: {} };
  if (action.type === 'color') {
    if (action.color !== null && !TABLE_COLORS.includes(action.color)) return state;
    const colors = { ...state.colors };
    if (action.color === null) delete colors[action.userId];
    else colors[action.userId] = action.color;
    return { ...state, colors };
  }
  if (action.type === 'rotate') {
    if (action.seat < 0 || action.seat >= state.players.length) return state;
    return { ...state, rotations: { ...state.rotations, [action.seat]: action.rotate } };
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
          const key = commanderDamageKey(action.fromUserId, action.index);
          const current = p.commanderDamage[key] ?? 0;
          const next = Math.max(0, current + action.delta);
          // Dano de comandante também é perda de vida (e "desfazer" devolve a vida).
          return {
            ...p,
            life: p.life - (next - current),
            commanderDamage: { ...p.commanderDamage, [key]: next },
          };
        }),
      );
    case 'commanders': {
      const withCount = updatePlayer(base, action.userId, (p) => ({
        ...p,
        commanderCount: action.count,
      }));
      if (action.count === 2) return withCount;
      // Sem o segundo comandante, o dano dele sai da conta de todos (a vida perdida fica).
      const gone = commanderDamageKey(action.userId, 1);
      return withDefeats({
        ...withCount,
        players: withCount.players.map((p) => {
          if (!(gone in p.commanderDamage)) return p;
          const { [gone]: _removed, ...rest } = p.commanderDamage;
          return { ...p, commanderDamage: rest };
        }),
      });
    }
    case 'concede':
      return withDefeats(
        updatePlayer(base, action.userId, (p) => ({ ...p, conceded: action.conceded })),
      );
    case 'died':
      return withDefeats(updatePlayer(base, action.userId, (p) => ({ ...p, died: action.died })));
    case 'monarch':
      return { ...base, monarchId: action.userId };
    case 'first':
      return { ...base, firstPlayerId: action.userId };
    case 'swap': {
      const a = state.players.findIndex((p) => p.userId === action.userId);
      const b = state.players.findIndex((p) => p.userId === action.withUserId);
      if (a < 0 || b < 0 || a === b) return state;
      const players = [...state.players];
      [players[a], players[b]] = [players[b]!, players[a]!];
      return { ...base, players };
    }
  }
}

/** Cor da área de quem está na posição `index`: a escolhida pelo jogador ou a da posição. */
export const seatColor = (state: TableState, index: number) =>
  state.colors?.[state.players[index]?.userId ?? ''] ?? SEAT_COLORS[index % SEAT_COLORS.length]!;

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

export * from './layout';

/**
 * Mudança pedida por um campo numérico do modo mesa (marcadores, dano de comandante): a
 * diferença para o valor atual, ou `null` quando não há o que mudar. Campo vazio é "apagando
 * para digitar outro número", não zero: o marcador continua como estava.
 */
export function fieldDelta(next: number | null, current: number): number | null {
  if (next === null || next === current) return null;
  return next - current;
}
