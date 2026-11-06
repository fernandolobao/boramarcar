import { isGameFormat, type GameFormat } from '../games';
import type { ScoredRole } from './roles';

/** Regras de montagem e metas de análise por formato de deck. */
export interface DeckFormatProfile {
  format: GameFormat;
  kind: 'commander' | 'constructed' | 'limited' | 'free';
  /** Tamanho do deck (zona de comando + principal). `max` igual a `min` = tamanho exato. */
  deckSize: { min: number; max: number | null } | null;
  /** Cópias por nome (terrenos básicos são livres). `null` = sem limite. */
  maxCopies: number | null;
  sideboardMax: number | null;
  commanders: { min: number; max: number } | null;
  lands: { min: number; max: number } | null;
  /** Metas de funções para a nota; `null` = formato sem nota. */
  roleTargets: Record<ScoredRole, number> | null;
  averageCmc: { ideal: number; max: number } | null;
  /** Nome do formato na busca do Scryfall (`f:`), quando existe. */
  scryfallFormat: string | null;
  /** Brackets oficiais só existem em Commander. */
  brackets: boolean;
}

const COMMANDER_ROLE_TARGETS = { ramp: 10, draw: 10, removal: 8, wipe: 2 };

const constructed = (format: GameFormat, scryfallFormat: string | null): DeckFormatProfile => ({
  format,
  kind: 'constructed',
  deckSize: { min: 60, max: null },
  maxCopies: 4,
  sideboardMax: 15,
  commanders: null,
  lands: { min: 22, max: 26 },
  roleTargets: null,
  averageCmc: null,
  scryfallFormat,
  brackets: false,
});

const limited = (format: GameFormat): DeckFormatProfile => ({
  format,
  kind: 'limited',
  deckSize: { min: 40, max: null },
  maxCopies: null,
  sideboardMax: null,
  commanders: null,
  lands: { min: 16, max: 18 },
  roleTargets: null,
  averageCmc: null,
  scryfallFormat: null,
  brackets: false,
});

export const DECK_FORMAT_PROFILES: Record<GameFormat, DeckFormatProfile> = {
  commander: {
    format: 'commander',
    kind: 'commander',
    deckSize: { min: 100, max: 100 },
    maxCopies: 1,
    sideboardMax: null,
    commanders: { min: 1, max: 2 },
    lands: { min: 36, max: 38 },
    roleTargets: COMMANDER_ROLE_TARGETS,
    averageCmc: { ideal: 3.0, max: 4.5 },
    scryfallFormat: 'commander',
    brackets: true,
  },
  // Brawl do Arena: 100 cartas, um comandante (dois só com Partner e afins).
  brawl: {
    format: 'brawl',
    kind: 'commander',
    deckSize: { min: 100, max: 100 },
    maxCopies: 1,
    sideboardMax: null,
    commanders: { min: 1, max: 2 },
    lands: { min: 36, max: 38 },
    roleTargets: COMMANDER_ROLE_TARGETS,
    averageCmc: { ideal: 3.0, max: 4.5 },
    scryfallFormat: 'brawl',
    brackets: false,
  },
  // Oathbreaker: 60 cartas contando o planeswalker e a mágica de assinatura (zona de comando).
  oathbreaker: {
    format: 'oathbreaker',
    kind: 'commander',
    deckSize: { min: 60, max: 60 },
    maxCopies: 1,
    sideboardMax: null,
    commanders: { min: 1, max: 2 },
    lands: { min: 20, max: 24 },
    roleTargets: { ramp: 5, draw: 6, removal: 5, wipe: 1 },
    averageCmc: { ideal: 2.8, max: 4 },
    scryfallFormat: 'oathbreaker',
    brackets: false,
  },
  two_headed_giant: constructed('two_headed_giant', null),
  standard: constructed('standard', 'standard'),
  pioneer: constructed('pioneer', 'pioneer'),
  modern: constructed('modern', 'modern'),
  legacy: constructed('legacy', 'legacy'),
  vintage: constructed('vintage', 'vintage'),
  pauper: constructed('pauper', 'pauper'),
  draft: limited('draft'),
  sealed: limited('sealed'),
  other: {
    format: 'other',
    kind: 'free',
    deckSize: null,
    maxCopies: null,
    sideboardMax: null,
    commanders: null,
    lands: null,
    roleTargets: null,
    averageCmc: null,
    scryfallFormat: null,
    brackets: false,
  },
};

/** Perfil do formato (desconhecido → `other`). */
export const deckFormatProfile = (format: string): DeckFormatProfile =>
  DECK_FORMAT_PROFILES[isGameFormat(format) ? format : 'other'];
