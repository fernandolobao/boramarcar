import { z } from 'zod';
import { DomainError } from '../errors';
import { DEFAULT_POINTS, validateGameResult, type GamePlayerResult } from '../ranking';

/** Tipos de jogo suportados. Guardados como texto no banco, então dá para adicionar novos. */
export const GAME_FORMATS = [
  'commander',
  'brawl',
  'oathbreaker',
  'two_headed_giant',
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'pauper',
  'draft',
  'sealed',
  'other',
] as const;
export type GameFormat = (typeof GAME_FORMATS)[number];

/** Estrutura da partida: todos contra todos, times ou um contra um. */
export type GameStructure = 'free_for_all' | 'teams' | 'duel';

export interface FormatRules {
  structure: GameStructure;
  minPlayers: number;
  maxPlayers: number;
  /** Jogadores por time (só em `teams`). */
  teamSize?: number;
  /** Formatos de deck com comandante (mostra a arte do comandante). */
  usesCommander: boolean;
  /** Limitado (draft/selado): o deck é montado na hora e costuma não estar cadastrado. */
  limited: boolean;
  /** Mesa padrão ao sugerir horários. */
  defaultTableSize: number;
}

const constructed = (): FormatRules => ({
  structure: 'duel',
  minPlayers: 2,
  maxPlayers: 2,
  usesCommander: false,
  limited: false,
  defaultTableSize: 2,
});

export const FORMAT_RULES: Record<GameFormat, FormatRules> = {
  commander: {
    structure: 'free_for_all',
    minPlayers: 2,
    maxPlayers: 8,
    usesCommander: true,
    limited: false,
    defaultTableSize: 4,
  },
  brawl: {
    structure: 'free_for_all',
    minPlayers: 2,
    maxPlayers: 6,
    usesCommander: true,
    limited: false,
    defaultTableSize: 4,
  },
  oathbreaker: {
    structure: 'free_for_all',
    minPlayers: 2,
    maxPlayers: 8,
    usesCommander: true,
    limited: false,
    defaultTableSize: 4,
  },
  two_headed_giant: {
    structure: 'teams',
    minPlayers: 4,
    maxPlayers: 4,
    teamSize: 2,
    usesCommander: false,
    limited: false,
    defaultTableSize: 4,
  },
  standard: constructed(),
  pioneer: constructed(),
  modern: constructed(),
  legacy: constructed(),
  vintage: constructed(),
  pauper: constructed(),
  draft: { ...constructed(), limited: true },
  sealed: { ...constructed(), limited: true },
  other: {
    structure: 'free_for_all',
    minPlayers: 2,
    maxPlayers: 8,
    usesCommander: false,
    limited: false,
    defaultTableSize: 4,
  },
};

export const isGameFormat = (value: unknown): value is GameFormat =>
  typeof value === 'string' && (GAME_FORMATS as readonly string[]).includes(value);

/** Formato conhecido ou `other` (dados antigos/desconhecidos não quebram a tela). */
export const formatRules = (format: string): FormatRules =>
  FORMAT_RULES[isGameFormat(format) ? format : 'other'];

export interface GamePlayerInput extends GamePlayerResult {
  seat?: number | null;
  /** Time (1, 2, …) em formatos de time. */
  team?: number | null;
  /** Ordem de eliminação: 1 = primeiro a sair. Vencedores não têm. */
  eliminatedOrder?: number | null;
}

export interface GameDetailsInput {
  format: GameFormat;
  players: readonly GamePlayerInput[];
  /** Quem começou (deve estar na partida). */
  firstPlayerId?: string | null;
  /** Turno em que a partida acabou. */
  winningTurn?: number | null;
  durationMinutes?: number | null;
}

/**
 * Valida uma partida conforme o tipo de jogo:
 * - número de jogadores do formato;
 * - todos contra todos / um contra um: no máximo um vencedor, ou empate;
 * - times: cada time completo; vence um time inteiro (todos `win`) ou empate geral;
 * - detalhes opcionais coerentes (quem começou está na partida, ordem de eliminação sem repetir).
 */
export function validateGame(input: GameDetailsInput): void {
  const rules = FORMAT_RULES[input.format];
  const { players } = input;
  if (!rules) throw new DomainError('invalid_input', 'Tipo de jogo inválido');
  if (players.length < rules.minPlayers || players.length > rules.maxPlayers) {
    throw new DomainError(
      'invalid_input',
      rules.minPlayers === rules.maxPlayers
        ? `Este tipo de jogo tem ${rules.minPlayers} jogadores`
        : `Este tipo de jogo aceita de ${rules.minPlayers} a ${rules.maxPlayers} jogadores`,
    );
  }

  if (rules.structure === 'teams') {
    validateTeams(players, rules.teamSize ?? 2);
  } else {
    if (players.some((p) => p.team != null)) {
      throw new DomainError('invalid_input', 'Este tipo de jogo não tem times');
    }
    validateGameResult(players);
  }

  if (input.firstPlayerId && !players.some((p) => p.userId === input.firstPlayerId)) {
    throw new DomainError('invalid_input', 'Quem começou precisa estar na partida');
  }
  const orders = players
    .map((p) => p.eliminatedOrder)
    .filter((o): o is number => o !== null && o !== undefined);
  if (orders.some((o) => !Number.isInteger(o) || o < 1 || o > players.length)) {
    throw new DomainError('invalid_input', 'Ordem de eliminação inválida');
  }
  if (new Set(orders).size !== orders.length) {
    throw new DomainError('invalid_input', 'Dois jogadores não podem sair na mesma posição');
  }
  if (players.some((p) => p.result === 'win' && p.eliminatedOrder != null)) {
    throw new DomainError('invalid_input', 'Quem venceu não foi eliminado');
  }
}

function validateTeams(players: readonly GamePlayerInput[], teamSize: number) {
  const ids = new Set(players.map((p) => p.userId));
  if (ids.size !== players.length) throw new DomainError('invalid_input', 'Jogador repetido');
  const teams = new Map<number, GamePlayerInput[]>();
  for (const player of players) {
    if (!player.team || !Number.isInteger(player.team) || player.team < 1) {
      throw new DomainError('invalid_input', 'Escolha o time de cada jogador');
    }
    teams.set(player.team, [...(teams.get(player.team) ?? []), player]);
  }
  if ([...teams.values()].some((members) => members.length !== teamSize)) {
    throw new DomainError('invalid_input', `Cada time precisa de ${teamSize} jogadores`);
  }
  const results = [...teams.values()].map((members) => {
    const set = new Set(members.map((m) => m.result));
    if (set.size !== 1) {
      throw new DomainError('invalid_input', 'Jogadores do mesmo time têm o mesmo resultado');
    }
    return members[0]!.result;
  });
  const winners = results.filter((r) => r === 'win').length;
  const draws = results.filter((r) => r === 'draw').length;
  if (winners > 1) throw new DomainError('invalid_input', 'Só um time pode vencer');
  if (winners === 1 && draws > 0) {
    throw new DomainError('invalid_input', 'Partida com vencedor não pode ter empate');
  }
  if (winners === 0 && draws === 0) {
    throw new DomainError('invalid_input', 'Informe o time vencedor ou marque empate');
  }
}

/* ---------- Configurações do grupo (1.12 e 2.7) ---------- */

export const groupSettingsSchema = z.object({
  /** Quantos jogadores fecham a mesa nas sugestões de horário. */
  tableSize: z.number().int().min(2).max(8),
  /** Duração mínima da janela sugerida, em minutos. */
  minDurationMinutes: z
    .number()
    .int()
    .min(30)
    .max(12 * 60),
  pointsWin: z.number().int().min(0).max(20),
  pointsDraw: z.number().int().min(0).max(20),
  pointsLoss: z.number().int().min(-20).max(20),
  defaultFormat: z.enum(GAME_FORMATS),
});
export type GroupSettings = z.infer<typeof groupSettingsSchema>;

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  tableSize: 4,
  minDurationMinutes: 120,
  pointsWin: DEFAULT_POINTS.win,
  pointsDraw: DEFAULT_POINTS.draw,
  pointsLoss: DEFAULT_POINTS.loss,
  defaultFormat: 'commander',
};

/** Valida configurações parciais e garante que vencer vale mais que empatar, que vale ≥ perder. */
export function validateGroupSettings(settings: GroupSettings): GroupSettings {
  const parsed = groupSettingsSchema.safeParse(settings);
  if (!parsed.success) throw new DomainError('invalid_input', 'Configurações inválidas');
  const s = parsed.data;
  if (!(s.pointsWin > s.pointsDraw && s.pointsDraw >= s.pointsLoss)) {
    throw new DomainError(
      'invalid_input',
      'A vitória precisa valer mais que o empate, e o empate pelo menos o mesmo que a derrota',
    );
  }
  return s;
}

export const pointsTableOf = (
  s: Pick<GroupSettings, 'pointsWin' | 'pointsDraw' | 'pointsLoss'>,
) => ({
  win: s.pointsWin,
  draw: s.pointsDraw,
  loss: s.pointsLoss,
});

/**
 * URL da arte recortada (art_crop) a partir da imagem da carta no Scryfall —
 * usada como capa do deck e miniatura do comandante.
 */
export function artCropUrl(imageUri: string | null | undefined): string | null {
  if (!imageUri) return null;
  return imageUri.replace(/\/(small|normal|large|png|border_crop)\//, '/art_crop/');
}
