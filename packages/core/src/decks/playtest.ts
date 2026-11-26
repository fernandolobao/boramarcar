import type { DeckBoard } from './types';
import { OPENING_HAND_SIZE, shuffle } from './hand';

/**
 * Mesa de testes solo (11.4): jogar turnos de mentira com o deck para "ver o deck girar", sem
 * regras automáticas (não confere custo, pilha nem combate). Tudo roda no navegador ou no app; o
 * redutor é puro (estado + ação → estado novo), o que deixa o "desfazer" trivial para a tela.
 */

export const PLAYTEST_ZONES = [
  'library',
  'hand',
  'battlefield',
  'graveyard',
  'exile',
  'command',
] as const;
export type PlaytestZone = (typeof PLAYTEST_ZONES)[number];

export interface PlaytestCard {
  /** Único por cópia (e por ficha). */
  uid: string;
  name: string;
  isLand: boolean;
  isToken: boolean;
  isCommander: boolean;
  imageUri: string | null;
  typeLine: string;
  manaCost: string | null;
  oracleText: string;
  colorIdentity: string[];
  tapped: boolean;
}

export interface PlaytestLine {
  name: string;
  board: DeckBoard;
  quantity: number;
  isLand: boolean;
  imageUri: string | null;
  typeLine: string;
  manaCost: string | null;
  oracleText: string;
  colorIdentity: string[];
}

export interface PlaytestState {
  /** O grimório vai do topo (índice 0) para o fundo. */
  zones: Record<PlaytestZone, PlaytestCard[]>;
  /** 0 = escolhendo a mão (mulligan); 1 em diante = turnos. */
  turn: number;
  life: number;
  mulligans: number;
  /** Cartas que ainda faltam ir para o fundo (mulligan de Londres) antes de manter. */
  toBottom: number;
  playFirst: boolean;
  /** Quantas vezes cada comandante saiu da zona de comando para o campo. */
  commanderCasts: Record<string, number>;
  /** Contador para dar `uid` às fichas. */
  nextToken: number;
}

export type PlaytestAction =
  | { type: 'mulligan' }
  | { type: 'bottom'; uid: string }
  | { type: 'keep' }
  | { type: 'nextTurn' }
  | { type: 'draw'; count?: number }
  | { type: 'move'; uid: string; to: PlaytestZone; position?: 'top' | 'bottom' }
  | { type: 'search'; uid: string; to: PlaytestZone }
  | { type: 'toggleTap'; uid: string }
  | { type: 'shuffle' }
  | { type: 'createToken'; name: string; count: number }
  | { type: 'life'; delta: number };

const MAX_TOKENS_AT_ONCE = 50;

const toCard = (line: PlaytestLine, uid: string, isCommander: boolean): PlaytestCard => ({
  uid,
  name: line.name,
  isLand: line.isLand,
  isToken: false,
  isCommander,
  imageUri: line.imageUri,
  typeLine: line.typeLine,
  manaCost: line.manaCost,
  oracleText: line.oracleText,
  colorIdentity: line.colorIdentity,
  tapped: false,
});

const emptyZones = (): Record<PlaytestZone, PlaytestCard[]> => ({
  library: [],
  hand: [],
  battlefield: [],
  graveyard: [],
  exile: [],
  command: [],
});

/** Monta a mesa: grimório com o deck principal, comandante(s) na zona de comando e a mão de 7. */
export function startPlaytest(
  lines: readonly PlaytestLine[],
  options: { startingLife: number; playFirst: boolean },
  random: () => number = Math.random,
): PlaytestState {
  const zones = emptyZones();
  const library: PlaytestCard[] = [];
  lines.forEach((line, i) => {
    if (line.board === 'commander') {
      for (let c = 0; c < line.quantity; c++) zones.command.push(toCard(line, `c${i}-${c}`, true));
    } else if (line.board === 'mainboard') {
      for (let c = 0; c < line.quantity; c++) library.push(toCard(line, `${i}-${c}`, false));
    }
  });
  const shuffled = shuffle(library, random);
  zones.hand = shuffled.slice(0, OPENING_HAND_SIZE);
  zones.library = shuffled.slice(OPENING_HAND_SIZE);
  return {
    zones,
    turn: 0,
    life: options.startingLife,
    mulligans: 0,
    toBottom: 0,
    playFirst: options.playFirst,
    commanderCasts: {},
    nextToken: 1,
  };
}

/** Onde está a carta (zona e posição). */
function locate(state: PlaytestState, uid: string) {
  for (const zone of PLAYTEST_ZONES) {
    const index = state.zones[zone].findIndex((c) => c.uid === uid);
    if (index >= 0) return { zone, index, card: state.zones[zone][index]! };
  }
  return null;
}

function draw(state: PlaytestState, count = 1): PlaytestState {
  const n = Math.max(0, Math.min(count, state.zones.library.length));
  if (!n) return state;
  return {
    ...state,
    zones: {
      ...state.zones,
      hand: [...state.zones.hand, ...state.zones.library.slice(0, n)],
      library: state.zones.library.slice(n),
    },
  };
}

function moveCard(
  state: PlaytestState,
  uid: string,
  to: PlaytestZone,
  position: 'top' | 'bottom' = 'top',
): PlaytestState {
  const found = locate(state, uid);
  if (!found) return state;
  const zones = {
    ...state.zones,
    [found.zone]: state.zones[found.zone].filter((c) => c.uid !== uid),
  };
  let commanderCasts = state.commanderCasts;
  if (found.card.isCommander && found.zone === 'command' && to === 'battlefield') {
    commanderCasts = { ...commanderCasts, [uid]: (commanderCasts[uid] ?? 0) + 1 };
  }
  // Ficha fora do campo deixa de existir.
  if (found.card.isToken && to !== 'battlefield') return { ...state, zones, commanderCasts };
  const card = { ...found.card, tapped: false };
  if (to === 'library') {
    zones.library = position === 'top' ? [card, ...zones.library] : [...zones.library, card];
  } else {
    zones[to] = [...zones[to], card];
  }
  return { ...state, zones, commanderCasts };
}

/** Aplica uma ação. Ações que não fazem sentido no momento devolvem o mesmo estado. */
export function playtest(
  state: PlaytestState,
  action: PlaytestAction,
  random: () => number = Math.random,
): PlaytestState {
  switch (action.type) {
    case 'mulligan': {
      if (state.turn !== 0) return state;
      const library = shuffle([...state.zones.library, ...state.zones.hand], random);
      return {
        ...state,
        zones: {
          ...state.zones,
          hand: library.slice(0, OPENING_HAND_SIZE),
          library: library.slice(OPENING_HAND_SIZE),
        },
        mulligans: state.mulligans + 1,
        toBottom: Math.min(state.mulligans + 1, OPENING_HAND_SIZE),
      };
    }
    case 'bottom': {
      if (state.turn !== 0 || state.toBottom <= 0) return state;
      const card = state.zones.hand.find((c) => c.uid === action.uid);
      if (!card) return state;
      return {
        ...state,
        zones: {
          ...state.zones,
          hand: state.zones.hand.filter((c) => c.uid !== action.uid),
          library: [...state.zones.library, card],
        },
        toBottom: state.toBottom - 1,
      };
    }
    case 'keep': {
      if (state.turn !== 0 || state.toBottom > 0) return state;
      const started = { ...state, turn: 1 };
      // Quem começa não compra no primeiro turno.
      return state.playFirst ? started : draw(started);
    }
    case 'nextTurn': {
      if (state.turn === 0) return state;
      const untapped = {
        ...state,
        turn: state.turn + 1,
        zones: {
          ...state.zones,
          battlefield: state.zones.battlefield.map((c) => (c.tapped ? { ...c, tapped: false } : c)),
        },
      };
      return draw(untapped);
    }
    case 'draw':
      return draw(state, action.count ?? 1);
    case 'move':
      return moveCard(state, action.uid, action.to, action.position);
    case 'search': {
      const found = locate(state, action.uid);
      if (found?.zone !== 'library') return state;
      const moved = moveCard(state, action.uid, action.to);
      return { ...moved, zones: { ...moved.zones, library: shuffle(moved.zones.library, random) } };
    }
    case 'toggleTap': {
      const found = locate(state, action.uid);
      if (found?.zone !== 'battlefield') return state;
      const battlefield = [...state.zones.battlefield];
      battlefield[found.index] = { ...found.card, tapped: !found.card.tapped };
      return { ...state, zones: { ...state.zones, battlefield } };
    }
    case 'shuffle':
      return { ...state, zones: { ...state.zones, library: shuffle(state.zones.library, random) } };
    case 'createToken': {
      const name = action.name.trim().slice(0, 80);
      const count = Math.max(0, Math.min(MAX_TOKENS_AT_ONCE, Math.floor(action.count)));
      if (!name || !count) return state;
      const tokens = Array.from({ length: count }, (_, i): PlaytestCard => ({
        uid: `t${state.nextToken + i}`,
        name,
        isLand: false,
        isToken: true,
        isCommander: false,
        imageUri: null,
        typeLine: 'Token',
        manaCost: null,
        oracleText: '',
        colorIdentity: [],
        tapped: false,
      }));
      return {
        ...state,
        nextToken: state.nextToken + count,
        zones: { ...state.zones, battlefield: [...state.zones.battlefield, ...tokens] },
      };
    }
    case 'life':
      return { ...state, life: state.life + Math.round(action.delta) };
  }
}

/**
 * Mana disponível: os terrenos desvirados no campo, cada um com as suas cores (pela identidade
 * de cor; sem cor = incolor, "C"). Sem regras: fontes que não são terrenos ficam de fora.
 */
export function manaAvailable(state: PlaytestState) {
  const sources = state.zones.battlefield
    .filter((c) => c.isLand && !c.tapped)
    .map((c) => (c.colorIdentity.length ? c.colorIdentity.join('') : 'C'));
  return { total: sources.length, sources };
}

/** Imposto do comandante: +2 para cada vez que ele já saiu da zona de comando para o campo. */
export const commanderTax = (state: PlaytestState, uid: string) =>
  2 * (state.commanderCasts[uid] ?? 0);
