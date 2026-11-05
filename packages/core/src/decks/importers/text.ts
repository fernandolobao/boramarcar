import type { DeckBoard, DeckEntry } from '../types';

/** Nome do deck no cabeçalho do formato MTG Arena ("About" / "Name Meu deck"). */
export function parseDeckTextName(text: string): string | null {
  const match = /^\s*About\s*\r?\n\s*Name\s+(.+?)\s*$/im.exec(text);
  return match?.[1]?.trim() || null;
}

const SECTION_ALIASES: Record<string, DeckBoard> = {
  commander: 'commander',
  commanders: 'commander',
  comandante: 'commander',
  deck: 'mainboard',
  main: 'mainboard',
  mainboard: 'mainboard',
  sideboard: 'sideboard',
  side: 'sideboard',
  maybeboard: 'maybeboard',
  maybe: 'maybeboard',
  considering: 'maybeboard',
  companion: 'sideboard',
};

/** Cabeçalhos que não são cartas nem boards (formato Arena). */
const IGNORED_HEADERS = /^(about|name\s.+)$/i;

// "1x Sol Ring (CMM) 400 *F* #proxy"
const LINE_RE =
  /^(?<qty>\d+)\s*x?\s+(?<name>.+?)(?:\s+\((?<set>[A-Za-z0-9]{2,6})\)(?:\s+(?<num>[\w-]+))?)?(?<flags>(?:\s+(?:\*[A-Za-z]+\*|#\w+|\[[^\]]+\]))*)\s*$/;

/** Detecta um cabeçalho de seção ("Commander", "// Sideboard", "SIDEBOARD:"). */
function parseSection(line: string): DeckBoard | null {
  const normalized = line
    .replace(/^\/\/\s*/, '')
    .replace(/[:\s]+$/, '')
    .replace(/\s*\(\d+\)$/, '')
    .trim()
    .toLowerCase();
  return SECTION_ALIASES[normalized] ?? null;
}

/**
 * Lê listas no formato texto usado por Moxfield, Archidekt, MTG Arena e similares.
 *
 * Convenções suportadas:
 * - `1 Sol Ring`, `1x Sol Ring`, `1 Sol Ring (CMM) 400`
 * - `*F*` / `*E*` marcam foil; `#proxy` ou `[proxy]` marca proxy
 * - Seções: `Commander`, `Deck`, `Sideboard`, `Maybeboard` (com ou sem `//` e `:`)
 * - Linha em branco após uma única carta inicial (formato Arena) = comandante
 */
export function parseDeckText(text: string): DeckEntry[] {
  const entries: DeckEntry[] = [];
  let board: DeckBoard = 'mainboard';
  let explicitSections = false;

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const section = parseSection(line);
    if (section) {
      board = section;
      explicitSections = true;
      continue;
    }
    if (line.startsWith('//') || IGNORED_HEADERS.test(line)) continue;

    const match = LINE_RE.exec(line);
    if (!match?.groups) continue;
    const { qty, name, set, num, flags = '' } = match.groups;
    const quantity = Number(qty);
    if (!name || !Number.isInteger(quantity) || quantity <= 0) continue;

    const lowerFlags = flags.toLowerCase();
    const entry: DeckEntry = { name: name.trim(), quantity, board };
    if (set) entry.setCode = set.toLowerCase();
    if (num) entry.collectorNumber = num;
    if (/\*[fe]\*/.test(lowerFlags)) entry.isFoil = true;
    if (/#proxy|\[proxy\]/.test(lowerFlags)) entry.isProxy = true;
    entries.push(entry);
  }

  // Formato "Commander" do Arena/Moxfield sem seções: a última linha separada por
  // uma linha em branco do resto costuma ser o comandante. Só aplicamos se não houver seções.
  if (!explicitSections) {
    const blocks = text
      .trim()
      .split(/\r?\n\s*\r?\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    const last = blocks.at(-1);
    if (blocks.length === 2 && last && last.split(/\r?\n/).length <= 2) {
      const commanderNames = new Set(parseDeckText(`Commander\n${last}`).map((e) => e.name));
      for (const entry of entries) {
        if (commanderNames.has(entry.name)) entry.board = 'commander';
      }
    }
  }

  return mergeDuplicates(entries);
}

/** Junta linhas repetidas da mesma carta no mesmo board e mesmo status de proxy. */
export function mergeDuplicates(entries: readonly DeckEntry[]): DeckEntry[] {
  const merged = new Map<string, DeckEntry>();
  for (const entry of entries) {
    const key = `${entry.board}|${entry.name.toLowerCase()}|${entry.isProxy ? 1 : 0}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += entry.quantity;
    else merged.set(key, { ...entry });
  }
  return [...merged.values()];
}
