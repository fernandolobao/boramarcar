import { manaSymbolUrl, splitManaText } from '@boramarcar/core/mana';
import { StyleSheet, View, type TextStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { t, type MessageKey } from '@/lib/i18n';
import { AppText } from './ui';

const COLOR: Record<string, MessageKey> = {
  W: 'recordsColorW',
  U: 'recordsColorU',
  B: 'recordsColorB',
  R: 'recordsColorR',
  G: 'recordsColorG',
  C: 'recordsColorC',
};

/** Nome do símbolo para leitores de tela ("W/U" → "branco ou azul", "T" → "virar"). */
export function manaSymbolName(symbol: string): string {
  const parts = symbol.toUpperCase().split('/');
  if (parts.length === 1 && parts[0] === 'T') return t('manaTap');
  if (parts.length === 1 && parts[0] === 'Q') return t('manaUntap');
  if (parts.length === 1 && parts[0] === 'S') return t('manaSnow');
  if (parts.length === 1 && parts[0] === 'E') return t('manaEnergy');
  const phyrexian = parts.at(-1) === 'P';
  const core = phyrexian ? parts.slice(0, -1) : parts;
  const name = core.map((p) => (COLOR[p] ? t(COLOR[p]).toLowerCase() : p)).join(` ${t('manaOr')} `);
  return phyrexian ? t('manaPhyrexian', { name }) : name;
}

/** Um símbolo (SVG oficial, do tamanho do texto); sem imagem conhecida, o texto entre chaves. */
export function ManaSymbol({ symbol, size = 16 }: { symbol: string; size?: number }) {
  const uri = manaSymbolUrl(symbol);
  if (!uri) return <AppText>{`{${symbol}}`}</AppText>;
  return (
    <View
      style={[s.symbol, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SvgUri uri={uri} width={size} height={size} />
    </View>
  );
}

/**
 * Texto de carta com os símbolos de mana desenhados (como no site), em vez de `{W}{U}`. O leitor
 * de tela recebe o texto com os nomes dos símbolos.
 */
export function ManaText({ text, style }: { text: string; style?: TextStyle }) {
  const pieces = splitManaText(text);
  const spoken = pieces
    .map((p) => ('text' in p ? p.text : `${manaSymbolName(p.symbol)} `))
    .join('');
  return (
    <AppText style={style} accessibilityLabel={spoken}>
      {pieces.map((p, i) => ('text' in p ? p.text : <ManaSymbol key={i} symbol={p.symbol} />))}
    </AppText>
  );
}

/** Custo de mana numa linha ("{2}{G}"). */
export function ManaCost({ cost, size = 18 }: { cost: string | null | undefined; size?: number }) {
  const symbols = splitManaText(cost ?? '').flatMap((p) => ('symbol' in p ? [p.symbol] : []));
  if (!symbols.length) return null;
  return (
    <View
      style={s.cost}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('manaCost', { symbols: symbols.map(manaSymbolName).join(', ') })}
    >
      {symbols.map((sym, i) => (
        <ManaSymbol key={i} symbol={sym} size={size} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  // Dentro de um texto, a imagem fica na linha; um pouco abaixo para alinhar com as letras.
  symbol: { marginHorizontal: 1, transform: [{ translateY: 3 }] },
  cost: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});
