import { DomainError } from '../errors';
import { DECK_BOARDS, type DeckBoard, type DeckEntry } from './types';

/** Linha do deck como gravada (uma por board/carta/status de proxy). */
export interface StoredDeckRow<C = unknown> {
  id: string;
  name: string;
  board: DeckBoard;
  quantity: number;
  isProxy: boolean;
  /** Cópia foil (brilhante). */
  isFoil?: boolean;
  /** Impressão escolhida (edição); `null` = carta sem dados do Scryfall. */
  scryfallId?: string | null;
  card: C | null;
}

/** Carta do deck com total de cópias e quantas são proxy (3.6: "3 de 10 Forests"). */
export interface DeckLine<C = unknown> {
  key: string;
  name: string;
  board: DeckBoard;
  quantity: number;
  proxies: number;
  /** Cópias foil (das reais): foil e não foil da mesma edição convivem na mesma linha. */
  foils: number;
  /** Todas as cópias reais desta linha são foil. */
  foil: boolean;
  /** Impressão (edição) desta linha: a mesma carta pode aparecer em várias edições. */
  scryfallId: string | null;
  card: C | null;
  ids: string[];
}

/** Chave de uma linha: board + carta + impressão. */
export const lineKey = (board: DeckBoard, name: string, scryfallId?: string | null) =>
  `${board}|${name.trim().toLowerCase()}|${scryfallId ?? ''}`;

/** Junta as linhas reais e proxy da mesma carta e da mesma edição no mesmo board. */
export function mergeDeckLines<C>(rows: readonly StoredDeckRow<C>[]): DeckLine<C>[] {
  const lines = new Map<string, DeckLine<C>>();
  for (const row of rows) {
    const key = lineKey(row.board, row.name, row.scryfallId);
    const line = lines.get(key) ?? {
      key,
      name: row.name,
      board: row.board,
      quantity: 0,
      proxies: 0,
      foils: 0,
      foil: true,
      scryfallId: row.scryfallId ?? null,
      card: row.card,
      ids: [],
    };
    line.quantity += row.quantity;
    if (row.isProxy) line.proxies += row.quantity;
    else if (row.isFoil) line.foils += row.quantity;
    line.card ??= row.card;
    line.ids.push(row.id);
    lines.set(key, line);
  }
  // "Foil" = todas as cópias reais são foil (proxies não contam).
  for (const line of lines.values()) {
    const real = line.quantity - line.proxies;
    line.foil = real > 0 && line.foils === real;
  }
  return [...lines.values()];
}

export const MAX_COPIES = 250;

/** Valida quantidade, proxies e foil de uma carta; quantidade 0 = remover. */
export function validateLine(quantity: number, proxies: number, foils = 0) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_COPIES) {
    throw new DomainError('invalid_input', `Quantidade deve ser de 0 a ${MAX_COPIES}`);
  }
  if (!Number.isInteger(proxies) || proxies < 0 || proxies > quantity) {
    throw new DomainError('invalid_input', 'Proxies devem ser de 0 até a quantidade da carta');
  }
  if (!Number.isInteger(foils) || foils < 0 || foils > quantity - proxies) {
    throw new DomainError('invalid_input', 'Cópias foil devem ser de 0 até as cópias reais');
  }
}

/**
 * Linhas a gravar para uma carta: cópias reais não foil, reais foil e proxies, cada grupo na
 * sua linha (foil e não foil são versões diferentes, com preços diferentes).
 */
export function splitLine(quantity: number, proxies: number, foils = 0) {
  validateLine(quantity, proxies, foils);
  return [
    { quantity: quantity - proxies - foils, isProxy: false, isFoil: false },
    { quantity: foils, isProxy: false, isFoil: true },
    { quantity: proxies, isProxy: true, isFoil: false },
  ].filter((r) => r.quantity > 0);
}

const SECTION_TITLE: Record<DeckBoard, string> = {
  commander: 'Commander',
  mainboard: 'Deck',
  sideboard: 'Sideboard',
  maybeboard: 'Maybeboard',
};

export type ExportFormat = 'plain' | 'proxies';

/**
 * Lista em texto com seções (Commander/Deck/Sideboard/Maybeboard), aceita por Moxfield,
 * Archidekt, MTG Arena e pelo próprio ArcanaKin. `proxies` marca as cópias proxy com
 * `#proxy` (reimportável aqui); `plain` não marca nada (para outros sites).
 */
export function exportDeckText(
  lines: readonly (Pick<DeckLine, 'name' | 'board' | 'quantity' | 'proxies'> & {
    foil?: boolean;
    /** Cópias foil (sem valor: todas se `foil`, senão nenhuma). */
    foils?: number;
    setCode?: string | null;
    collectorNumber?: string | null;
  })[],
  format: ExportFormat = 'plain',
) {
  // Edição no padrão aceito por Moxfield/Archidekt/Arena: "1 Sol Ring (CMM) 400", e foil
  // com "*F*" (Moxfield e o importador daqui).
  const label = (l: (typeof lines)[number], foil = false) =>
    (l.setCode && l.collectorNumber
      ? `${l.name} (${l.setCode.toUpperCase()}) ${l.collectorNumber}`
      : l.name) + (foil ? ' *F*' : '');
  const foilsOf = (l: (typeof lines)[number]) =>
    Math.min(l.foils ?? (l.foil ? l.quantity - l.proxies : 0), l.quantity - l.proxies);
  const sections = DECK_BOARDS.map((board) => {
    const own = lines
      .filter((l) => l.board === board && l.quantity > 0)
      .sort((a, b) => a.name.localeCompare(b.name) || label(a).localeCompare(label(b)));
    if (!own.length) return null;
    const rows = own.flatMap((l) => {
      const foils = foilsOf(l);
      // Proxies contam como cópias comuns na lista "plain" (para outros sites).
      const plainCopies =
        format === 'proxies' ? l.quantity - l.proxies - foils : l.quantity - foils;
      return [
        ...(plainCopies > 0 ? [`${plainCopies} ${label(l)}`] : []),
        ...(foils > 0 ? [`${foils} ${label(l, true)}`] : []),
        ...(format === 'proxies' && l.proxies > 0 ? [`${l.proxies} ${label(l)} #proxy`] : []),
      ];
    });
    return [SECTION_TITLE[board], ...rows].join('\n');
  }).filter(Boolean);
  return sections.join('\n\n') + '\n';
}

export interface SyncResult {
  rows: {
    name: string;
    board: DeckBoard;
    quantity: number;
    isProxy: boolean;
    isFoil: boolean;
    entry: DeckEntry;
  }[];
  added: string[];
  removed: string[];
  changed: string[];
}

/**
 * Reimportação (3.8): a lista nova manda nas quantidades; as marcações de proxy antigas são
 * mantidas (no mesmo board, ou em outro se a carta mudou de board), limitadas à nova quantidade.
 */
export function planDeckSync(
  current: readonly (Pick<DeckLine, 'name' | 'board' | 'quantity' | 'proxies'> & {
    scryfallId?: string | null;
  })[],
  incoming: readonly DeckEntry[],
): SyncResult {
  // Entradas já associadas às cartas: `scryfallId` é a impressão (edição).
  // Por linha (board, carta, edição), separando as cópias foil das comuns.
  const merged = new Map<string, { entry: DeckEntry; quantity: number; foils: number }>();
  for (const entry of incoming) {
    const key = lineKey(entry.board, entry.name, entry.scryfallId);
    const foils = entry.isFoil ? entry.quantity : 0;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += entry.quantity;
      existing.foils += foils;
    } else merged.set(key, { entry, quantity: entry.quantity, foils });
  }
  const before = new Map(current.map((l) => [lineKey(l.board, l.name, l.scryfallId), l]));
  const proxiesByName = new Map<string, number>();
  for (const l of current) {
    const name = l.name.toLowerCase();
    proxiesByName.set(name, (proxiesByName.get(name) ?? 0) + l.proxies);
  }

  const rows: SyncResult['rows'] = [];
  const added: string[] = [];
  const changed: string[] = [];
  for (const [key, { entry, quantity, foils }] of merged) {
    const old = before.get(key);
    const nameKey = entry.name.toLowerCase();
    const available = proxiesByName.get(nameKey) ?? 0;
    const proxies = Math.min(old?.proxies ?? available, available, quantity);
    proxiesByName.set(nameKey, available - proxies);
    for (const part of splitLine(quantity, proxies, Math.min(foils, quantity - proxies))) {
      rows.push({ name: entry.name, board: entry.board, entry, ...part });
    }
    if (!old) added.push(entry.name);
    else if (old.quantity !== quantity) changed.push(entry.name);
  }
  const removed = current
    .filter((l) => !merged.has(lineKey(l.board, l.name, l.scryfallId)))
    .map((l) => l.name);
  return { rows, added, removed, changed };
}
