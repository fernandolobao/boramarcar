import type { CardData } from '../decks/types';
import { TAGGER_ROLES, type TaggerRole } from './tagger';

/** Todas as funções exibidas (Tagger); as heurísticas locais cobrem só as quatro primeiras. */
export const CARD_ROLES = TAGGER_ROLES;
export type CardRole = TaggerRole;
/** Funções que entram na nota do deck. */
export const SCORED_ROLES = ['ramp', 'draw', 'removal', 'wipe'] as const;
export type ScoredRole = (typeof SCORED_ROLES)[number];

const RAMP_PATTERNS = [
  /\badd (?:\{[wubrgc]\}|one mana|two mana|three mana|an amount of|mana)/i,
  /search your library for (?:a|an|up to \w+|two)\b[^.]*\b(?:land|forest|plains|island|swamp|mountain)/i,
  /put (?:a|an|up to \w+) [^.]*land cards? [^.]*onto the battlefield/i,
  /you may play (?:an|two) additional lands?/i,
  /create (?:a|two|three) treasure tokens?/i,
];
const DRAW_PATTERNS = [
  /\bdraws? (?:a|an|one|two|three|four|five|x|that many|cards equal)\b[^.]*cards?/i,
  /\bdraw cards equal\b/i,
  /exile the top [^.]* cards?[^.]*you may (?:play|cast)/i,
];
const REMOVAL_PATTERNS = [
  /\b(?:destroy|exile) target (?:creature|artifact|enchantment|planeswalker|permanent|nonland permanent|creature or planeswalker)/i,
  /deals? (?:\d+|x) damage to (?:any target|target creature|target planeswalker)/i,
  /return target (?:creature|nonland permanent|permanent)[^.]* to its owner's hand/i,
  /counter target spell/i,
  /target (?:creature|player) (?:sacrifices|gets -\d+\/-\d+)/i,
];
const WIPE_PATTERNS = [
  /\b(?:destroy|exile) all (?:creatures|nonland permanents|artifacts|enchantments|other creatures|permanents)/i,
  /all creatures get -\d+\/-\d+/i,
  /deals? (?:\d+|x) damage to each creature/i,
  /return all (?:creatures|nonland permanents) to their owners' hands/i,
  /each player sacrifices (?:all|that many|\w+) creatures/i,
];

const matchesAny = (text: string, patterns: RegExp[]) => patterns.some((re) => re.test(text));

export const isLand = (card: Pick<CardData, 'typeLine'>) =>
  /\bLand\b/.test(card.typeLine.split(' // ')[0] ?? '');

export const isBasicLand = (card: Pick<CardData, 'typeLine'>) =>
  /\bBasic\b.*\bLand\b/.test(card.typeLine);

/**
 * Classifica uma carta em funções comuns de Commander com heurísticas sobre o texto de regras.
 * É uma aproximação: o roadmap prevê usar as tags do Scryfall Tagger para mais precisão.
 */
export function classifyCard(card: Pick<CardData, 'typeLine' | 'oracleText'>): Set<ScoredRole> {
  const roles = new Set<ScoredRole>();
  if (isLand(card)) return roles;
  const text = card.oracleText ?? '';
  if (matchesAny(text, RAMP_PATTERNS)) roles.add('ramp');
  if (matchesAny(text, DRAW_PATTERNS)) roles.add('draw');
  if (matchesAny(text, WIPE_PATTERNS)) roles.add('wipe');
  else if (matchesAny(text, REMOVAL_PATTERNS)) roles.add('removal');
  return roles;
}

/**
 * Funções da carta: as do Scryfall Tagger quando já consultadas (`roles` não nulo) e, senão,
 * as heurísticas pelo texto. Varredura e remoção pontual não se somam (como nas heurísticas).
 */
export function cardRoles(card: Pick<CardData, 'typeLine' | 'oracleText' | 'roles'>): {
  roles: Set<CardRole>;
  tagged: boolean;
} {
  if (card.roles) {
    const roles = new Set(
      card.roles.filter((r): r is CardRole => CARD_ROLES.includes(r as CardRole)),
    );
    if (roles.has('wipe')) roles.delete('removal');
    return { roles, tagged: true };
  }
  return { roles: classifyCard(card), tagged: false };
}
