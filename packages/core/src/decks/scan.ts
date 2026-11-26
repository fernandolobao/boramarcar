/**
 * Leitura de carta pela câmera (texto): do que o leitor de texto (OCR) achou na carta, os nomes
 * candidatos e a linha de colecionador (edição, número e língua). Puro: a busca da carta fica no
 * servidor. Calibrado com leituras reais de celular (cartas em inglês e português).
 */

export interface ScanLine {
  text: string;
  /** Posição da linha na imagem: 0 = topo, 1 = base. */
  top: number;
}

export interface ScanReading {
  /** Nomes lidos (os mais longos primeiro). */
  names: string[];
  /** Nomes e variações sem palavras do fim (lixo colado), na ordem de busca. */
  candidates: string[];
  /** Código da edição em maiúsculas (ex.: `LCI`), da linha de colecionador. */
  set: string | null;
  /** Número de colecionador sem zeros à esquerda (ex.: `38`). */
  number: string | null;
  /** Língua impressa (`en`, `pt`…). */
  lang: string;
  /** O número veio no formato da linha de colecionador ("0499", "190/332"): sinal forte. */
  strongNumber: boolean;
}

/** Palavra com cara de nome de carta, inclusive as de ligação em inglês e português. */
const NAME_WORD =
  /^([A-ZÀ-Ý][a-zà-ÿ'’,-]+[a-zA-Zà-ÿÀ-Ý'’,-]*|of|the|and|to|a|in|from|for|with|on|de|do|da|dos|das|e|o|os|as|no|na|nos|nas|em|por|para|com|sem|ao|aos|à|às|pelo|pela|pelos|pelas|um|uma|sob|sobre|entre|contra)$/;

/** Palavras da linha de tipo (inglês e português): não começam nome de carta. */
const TYPE_WORDS = new Set(
  (
    'Artifact Creature Instant Sorcery Enchantment Land Legendary Basic Token Planeswalker Battle ' +
    'Tribal Kindred Snow World Aura Equipment Vehicle Artefato Criatura Mágica Magica Feitiço ' +
    'Feitico Encantamento Terreno Lendária Lendario Lendária Básico Basico Ficha'
  ).split(' '),
);

/** Linhas que nunca são nome: copyright, ilustrador. */
const NOT_NAME = /wizards|coast|©|™|illus/i;

/** Numa linha lida, a sequência mais longa de palavras com cara de nome ('' se não houver). */
export function nameCandidate(text: string): string {
  const tokens = text
    .replace(/[^A-Za-zÀ-ÿ'’, -]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let best: string[] = [];
  let run: string[] = [];
  for (const t of tokens) {
    if (NAME_WORD.test(t) && (t.length > 1 || run.length > 0)) run.push(t);
    else run = [];
    const longer = run.join('').length > best.join('').length;
    if (run.length > best.length || (run.length === best.length && longer)) best = [...run];
  }
  // Palavras de ligação soltas nas pontas não fazem parte do nome.
  while (best.length && /^[a-zà-ÿ]/.test(best.at(-1)!)) best.pop();
  while (best.length && /^[a-zà-ÿ]/.test(best[0]!)) best.shift();
  if (best.length && TYPE_WORDS.has(best[0]!.replace(/,/g, ''))) return '';
  return best.join(' ').replace(/,$/, '');
}

/** O nome e ele sem palavras do fim, até 2 palavras ("Ritual Sombrio Ola Ds" → … "Ritual Sombrio"). */
function variants(name: string) {
  const words = name.split(' ');
  const out = [name];
  for (let n = words.length - 1; n >= 2; n--) out.push(words.slice(0, n).join(' '));
  return out;
}

const letters = (s: string) => s.replace(/[^A-Za-zÀ-ÿ]/g, '').length;

/** Semelhança entre dois nomes (0–1), pela distância de edição, sem acentos nem maiúsculas. */
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z ]/g, '');
  const x = norm(a);
  const y = norm(b);
  const d: number[] = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[y.length]! / Math.max(x.length, y.length, 1);
}

/** Línguas impressas na linha de colecionador. */
const LANGS = 'EN|PT|ES|JP|JA|DE|FR|IT|KO|RU|CS|CT|ZHS|ZHT';

/**
 * Interpreta o texto lido de uma carta. `nameZone`: até onde (fração da altura) procurar o nome —
 * na moldura da câmera, a faixa de cima (~0,22); numa foto inteira, 1.
 */
export function readCardText(input: {
  text: string;
  lines: readonly ScanLine[];
  nameZone: number;
}): ScanReading {
  const { text } = input;
  const names = [
    ...new Set(
      input.lines
        .filter((l) => l.top < input.nameZone && !NOT_NAME.test(l.text))
        .map((l) => nameCandidate(l.text))
        .filter((n) => letters(n) >= 4),
    ),
  ]
    .sort((a, b) => letters(b) - letters(a))
    .slice(0, 3);
  const candidates = [...new Set(names.flatMap(variants))].slice(0, 6);

  // Linha de colecionador das cartas novas: "0123 C" e "DMU • EN" (o "•" às vezes vira "+").
  // O código da edição tem 3 a 5 caracteres com ao menos uma letra ("038" é o número).
  const setMatch = new RegExp(
    `\\b((?=[A-Za-z0-9]{0,4}[A-Za-z])[A-Za-z0-9]{3,5})\\W{0,3}(${LANGS})\\b`,
  ).exec(text);
  const set = setMatch?.[1]?.toUpperCase() ?? null;
  const lang = setMatch?.[2]?.toLowerCase() ?? 'en';
  const before = setMatch ? text.slice(Math.max(0, setMatch.index - 40), setMatch.index) : '';
  // Número: "190/332", "0499" (zero à esquerda) ou seguido da raridade; anos não contam.
  const numbers = [...before.matchAll(/\b(\d{1,4})\b(\s*[CURMSLT]\b)?/g)].filter(
    (m) => !/^(19|20)\d\d$/.test(m[1]!),
  );
  const slash = /\b(\d{1,4})\s*\/\s*\d{1,4}\b/.exec(before)?.[1];
  const marked = numbers.find((m) => m[1]!.startsWith('0') || m[2])?.[1];
  const raw = slash ?? marked ?? numbers.at(-1)?.[1] ?? null;
  return {
    names,
    candidates,
    set,
    number: raw ? String(Number(raw)) : null,
    lang,
    strongNumber: Boolean(slash ?? marked),
  };
}
