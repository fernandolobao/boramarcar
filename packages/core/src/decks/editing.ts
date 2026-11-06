import { DomainError } from '../errors';
import { DECK_BOARDS, type DeckBoard, type DeckEntry } from './types';

/** Linha do deck como gravada (uma por board/carta/status de proxy). */
export interface StoredDeckRow<C = unknown> {
  id: string;
  name: string;
  board: DeckBoard;
  quantity: number;
  isProxy: boolean;
  card: C | null;
}

/** Carta do deck com total de cópias e quantas são proxy (3.6: "3 de 10 Forests"). */
export interface DeckLine<C = unknown> {
  key: string;
  name: string;
  board: DeckBoard;
  quantity: number;
  proxies: number;
  card: C | null;
  ids: string[];
}

export const lineKey = (board: DeckBoard, name: string) => `${board}|${name.trim().toLowerCase()}`;

/** Junta as linhas reais e proxy da mesma carta no mesmo board. */
export function mergeDeckLines<C>(rows: readonly StoredDeckRow<C>[]): DeckLine<C>[] {
  const lines = new Map<string, DeckLine<C>>();
  for (const row of rows) {
    const key = lineKey(row.board, row.name);
    const line = lines.get(key) ?? {
      key,
      name: row.name,
      board: row.board,
      quantity: 0,
      proxies: 0,
      card: row.card,
      ids: [],
    };
    line.quantity += row.quantity;
    if (row.isProxy) line.proxies += row.quantity;
    line.card ??= row.card;
    line.ids.push(row.id);
    lines.set(key, line);
  }
  return [...lines.values()];
}

export const MAX_COPIES = 250;

/** Valida quantidade e proxies de uma carta; quantidade 0 = remover. */
export function validateLine(quantity: number, proxies: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_COPIES) {
    throw new DomainError('invalid_input', `Quantidade deve ser de 0 a ${MAX_COPIES}`);
  }
  if (!Number.isInteger(proxies) || proxies < 0 || proxies > quantity) {
    throw new DomainError('invalid_input', 'Proxies devem ser de 0 até a quantidade da carta');
  }
}

/** Linhas a gravar para uma carta: cópias reais e cópias proxy em linhas separadas. */
export function splitLine(quantity: number, proxies: number) {
  validateLine(quantity, proxies);
  return [
    { quantity: quantity - proxies, isProxy: false },
    { quantity: proxies, isProxy: true },
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
 * Archidekt, MTG Arena e pelo próprio Bora Marcar. `proxies` marca as cópias proxy com
 * `#proxy` (reimportável aqui); `plain` não marca nada (para outros sites).
 */
export function exportDeckText(
  lines: readonly Pick<DeckLine, 'name' | 'board' | 'quantity' | 'proxies'>[],
  format: ExportFormat = 'plain',
) {
  const sections = DECK_BOARDS.map((board) => {
    const own = lines
      .filter((l) => l.board === board && l.quantity > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!own.length) return null;
    const rows = own.flatMap((l) =>
      format === 'proxies' && l.proxies > 0
        ? [
            ...(l.quantity > l.proxies ? [`${l.quantity - l.proxies} ${l.name}`] : []),
            `${l.proxies} ${l.name} #proxy`,
          ]
        : [`${l.quantity} ${l.name}`],
    );
    return [SECTION_TITLE[board], ...rows].join('\n');
  }).filter(Boolean);
  return sections.join('\n\n') + '\n';
}

export interface SyncResult {
  rows: { name: string; board: DeckBoard; quantity: number; isProxy: boolean; entry: DeckEntry }[];
  added: string[];
  removed: string[];
  changed: string[];
}

/**
 * Reimportação (3.8): a lista nova manda nas quantidades; as marcações de proxy antigas são
 * mantidas (no mesmo board, ou em outro se a carta mudou de board), limitadas à nova quantidade.
 */
export function planDeckSync(
  current: readonly Pick<DeckLine, 'name' | 'board' | 'quantity' | 'proxies'>[],
  incoming: readonly DeckEntry[],
): SyncResult {
  const merged = new Map<string, { entry: DeckEntry; quantity: number }>();
  for (const entry of incoming) {
    const key = lineKey(entry.board, entry.name);
    const existing = merged.get(key);
    if (existing) existing.quantity += entry.quantity;
    else merged.set(key, { entry, quantity: entry.quantity });
  }
  const before = new Map(current.map((l) => [lineKey(l.board, l.name), l]));
  const proxiesByName = new Map<string, number>();
  for (const l of current) {
    const name = l.name.toLowerCase();
    proxiesByName.set(name, (proxiesByName.get(name) ?? 0) + l.proxies);
  }

  const rows: SyncResult['rows'] = [];
  const added: string[] = [];
  const changed: string[] = [];
  for (const [key, { entry, quantity }] of merged) {
    const old = before.get(key);
    const nameKey = entry.name.toLowerCase();
    const available = proxiesByName.get(nameKey) ?? 0;
    const proxies = Math.min(old?.proxies ?? available, available, quantity);
    proxiesByName.set(nameKey, available - proxies);
    for (const part of splitLine(quantity, proxies)) {
      rows.push({ name: entry.name, board: entry.board, entry, ...part });
    }
    if (!old) added.push(entry.name);
    else if (old.quantity !== quantity) changed.push(entry.name);
  }
  const removed = current.filter((l) => !merged.has(lineKey(l.board, l.name))).map((l) => l.name);
  return { rows, added, removed, changed };
}
