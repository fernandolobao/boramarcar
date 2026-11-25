/**
 * Símbolos de mana no texto e no custo das cartas, para o app (o site usa a fonte de símbolos).
 * O texto do Scryfall traz os símbolos entre chaves: "{W}{U}: …", "{T}, Sacrifice …".
 */
export type ManaPiece = { text: string } | { symbol: string };

/** "{W}{U}: Draw." → [{symbol:'W'}, {symbol:'U'}, {text:': Draw.'}] */
export function splitManaText(text: string): ManaPiece[] {
  const pieces: ManaPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(/\{([^{}]{1,8})\}/g)) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) });
    pieces.push({ symbol: match[1]!.toUpperCase() });
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

/**
 * SVG oficial do símbolo (o mesmo desenho das cartas), servido pelo Scryfall: "W/U" → `WU.svg`.
 * `null` para o que não é símbolo conhecido (o app mostra o texto entre chaves).
 */
export function manaSymbolUrl(symbol: string): string | null {
  const name = symbol.toUpperCase().replace(/\//g, '');
  if (
    !/^(?:[WUBRGCSXYZETQP]|\d{1,2}|½|∞|[WUBRGC2][WUBRGP]|[WUBRG][WUBRG]P|HW|HR|CHAOS|PW|TK|A)$/.test(
      name,
    )
  ) {
    return null;
  }
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(name)}.svg`;
}
