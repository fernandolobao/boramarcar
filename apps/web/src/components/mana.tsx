import { useTranslations } from 'next-intl';

/** Símbolos que o subconjunto do Mana Font cobre (ver `src/styles/mana.css`). */
const SINGLE = new Set(['w', 'u', 'b', 'r', 'g', 'c', 's', 'x', 'y', 'z', 'e']);
const COLOR_KEYS = ['w', 'u', 'b', 'r', 'g', 'c'] as const;
type ColorKey = (typeof COLOR_KEYS)[number];

/** "{2}{G}{W/U}{G/P}" → ["2", "G", "W/U", "G/P"]. */
export const parseManaCost = (cost: string | null | undefined) =>
  [...(cost ?? '').matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!.toUpperCase());

/** Classe do Mana Font para um símbolo do Scryfall ("W/U" → "ms-wu", "T" → "ms-tap"). */
export function manaClass(symbol: string): string | null {
  const s = symbol.toLowerCase().replace(/\//g, '');
  if (s === 't') return 'ms-tap';
  if (s === 'q') return 'ms-untap';
  if (/^\d+$/.test(s) && Number(s) <= 20) return `ms-${s}`;
  if (SINGLE.has(s)) return `ms-${s}`;
  if (/^(wu|wb|ub|ur|br|bg|rw|rg|gw|gu)p?$/.test(s)) return `ms-${s}`;
  if (/^[2c][wubrg]$/.test(s) || /^[wubrg]p$/.test(s)) return `ms-${s}`;
  return null;
}

function useSymbolName() {
  const t = useTranslations('mana');
  const color = (c: string) =>
    (COLOR_KEYS as readonly string[]).includes(c) ? t(`colors.${c as ColorKey}`) : c.toUpperCase();
  return (symbol: string) => {
    const parts = symbol.toLowerCase().split('/');
    const phyrexian = parts.at(-1) === 'p';
    const core = phyrexian ? parts.slice(0, -1) : parts;
    if (core.length === 1 && core[0] === 's') return t('snow');
    if (core.length === 1 && core[0] === 't') return t('tap');
    const name = core.map((p) => (/^\d+$/.test(p) ? p : color(p))).join(` ${t('or')} `);
    return phyrexian ? t('phyrexian', { name }) : name;
  };
}

/** Um símbolo de mana decorativo; quem usa fornece o texto (ou use `ManaCost`). */
export function ManaSymbol({ symbol, className = '' }: { symbol: string; className?: string }) {
  const cls = manaClass(symbol);
  if (!cls) return <span aria-hidden="true">{`{${symbol}}`}</span>;
  return <i aria-hidden="true" className={`ms ms-cost ms-shadow ${cls} ${className}`} />;
}

/** Custo de mana com os símbolos reais e nome acessível por extenso ("Custo de mana: 2, verde"). */
export function ManaCost({
  cost,
  className = '',
}: {
  cost: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations('mana');
  const nameOf = useSymbolName();
  const symbols = parseManaCost(cost);
  if (!symbols.length) return null;
  return (
    <span
      role="img"
      aria-label={t('cost', { symbols: symbols.map(nameOf).join(', ') })}
      className={`inline-flex flex-wrap items-center gap-0.5 align-middle ${className}`}
    >
      {symbols.map((s, i) => (
        <ManaSymbol key={`${s}-${i}`} symbol={s} />
      ))}
    </span>
  );
}

/** Nome da cor (W, U, B, R, G, C) para textos acessíveis. */
export function useColorName() {
  const t = useTranslations('mana');
  return (c: string) => t(`colors.${c.toLowerCase() as ColorKey}`);
}
