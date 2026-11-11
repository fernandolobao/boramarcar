import { DomainError } from '../errors';
import { FORMAT_RULES, validateGame, type GameFormat, type GamePlayerInput } from './index';

/**
 * Formulário simples de partida (app mobile): todos contra todos ou duelo, com vencedor ou empate.
 * Partidas em times continuam no formulário completo do site.
 */
export interface SimpleGameForm {
  format: GameFormat;
  /** Jogadores na ordem da mesa (o assento é a posição na lista). */
  playerIds: readonly string[];
  decks?: Readonly<Record<string, string | null | undefined>>;
  /** Id do vencedor, `'draw'` para empate ou `null` se ainda não escolhido. */
  winner: string | null;
  firstPlayerId?: string | null;
  /** Campos digitados (vazio = não informado). */
  winningTurn?: string;
  durationMinutes?: string;
  notes?: string;
}

export type SimpleGameError =
  | { code: 'teams' }
  | { code: 'players'; min: number; max: number }
  | { code: 'result' }
  | { code: 'turn' }
  | { code: 'duration' }
  | { code: 'invalid'; message: string };

export interface SimpleGame {
  format: GameFormat;
  firstPlayerId: string | null;
  winningTurn: number | null;
  durationMinutes: number | null;
  notes: string | null;
  players: GamePlayerInput[];
}

/** Inteiro positivo digitado; vazio = `null`; qualquer outra coisa = `NaN`. */
export function parseOptionalInt(text: string | undefined): number | null {
  const value = (text ?? '').trim();
  if (!value) return null;
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

const inRange = (value: number | null, min: number, max: number) =>
  value === null || (Number.isInteger(value) && value >= min && value <= max);

/** Monta e valida a partida do formulário simples (mesmas regras do servidor). */
export function buildSimpleGame(
  form: SimpleGameForm,
): { ok: true; game: SimpleGame } | { ok: false; error: SimpleGameError } {
  const rules = FORMAT_RULES[form.format];
  if (rules.structure === 'teams') return { ok: false, error: { code: 'teams' } };
  const ids = [...new Set(form.playerIds)];
  if (ids.length < rules.minPlayers || ids.length > rules.maxPlayers) {
    return {
      ok: false,
      error: { code: 'players', min: rules.minPlayers, max: rules.maxPlayers },
    };
  }
  const { winner } = form;
  if (!winner || (winner !== 'draw' && !ids.includes(winner))) {
    return { ok: false, error: { code: 'result' } };
  }
  const winningTurn = parseOptionalInt(form.winningTurn);
  if (!inRange(winningTurn, 1, 99)) return { ok: false, error: { code: 'turn' } };
  const durationMinutes = parseOptionalInt(form.durationMinutes);
  if (!inRange(durationMinutes, 1, 24 * 60)) return { ok: false, error: { code: 'duration' } };
  const first = form.firstPlayerId && ids.includes(form.firstPlayerId) ? form.firstPlayerId : null;

  const game: SimpleGame = {
    format: form.format,
    firstPlayerId: first,
    winningTurn,
    durationMinutes,
    notes: form.notes?.trim().slice(0, 500) || null,
    players: ids.map((userId, i) => ({
      userId,
      deckId: form.decks?.[userId] ?? null,
      seat: i + 1,
      result: winner === 'draw' ? 'draw' : userId === winner ? 'win' : 'loss',
    })),
  };
  try {
    validateGame(game);
  } catch (e) {
    if (e instanceof DomainError)
      return { ok: false, error: { code: 'invalid', message: e.message } };
    throw e;
  }
  return { ok: true, game };
}
