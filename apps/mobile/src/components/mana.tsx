import { manaSymbolUrl, splitManaText } from '@boramarcar/core/mana';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
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

/**
 * SVGs já baixados, por endereço: cada símbolo é buscado uma vez por sessão do app (uma lista de
 * deck com 100 cartas repete os mesmos poucos símbolos). Falha de rede não fica guardada.
 */
const svgCache = new Map<string, string>();
const svgLoading = new Map<string, Promise<string | null>>();

function loadSvg(uri: string): Promise<string | null> {
  let pending = svgLoading.get(uri);
  if (!pending) {
    pending = fetch(uri)
      .then((r) => (r.ok ? r.text() : null))
      .then((xml) => {
        if (xml) svgCache.set(uri, xml);
        return xml;
      })
      .catch(() => null)
      .finally(() => svgLoading.delete(uri));
    svgLoading.set(uri, pending);
  }
  return pending;
}

function useSvg(uri: string | null) {
  const [xml, setXml] = useState(() => (uri ? (svgCache.get(uri) ?? null) : null));
  useEffect(() => {
    if (!uri || svgCache.has(uri)) return;
    let alive = true;
    void loadSvg(uri).then((x) => alive && setXml(x));
    return () => {
      alive = false;
    };
  }, [uri]);
  return xml;
}

/** Um símbolo (SVG oficial, do tamanho do texto); sem imagem conhecida, o texto entre chaves. */
export function ManaSymbol({ symbol, size = 16 }: { symbol: string; size?: number }) {
  const uri = manaSymbolUrl(symbol);
  const xml = useSvg(uri);
  if (!uri) return <AppText>{`{${symbol}}`}</AppText>;
  return (
    <View
      style={[s.symbol, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {xml ? <SvgXml xml={xml} width={size} height={size} /> : null}
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

/** Custo de mana por extenso para leitores de tela ("Custo de mana: 2, verde"); vazio sem custo. */
export function manaCostLabel(cost: string | null | undefined): string {
  const symbols = splitManaText(cost ?? '').flatMap((p) => ('symbol' in p ? [p.symbol] : []));
  return symbols.length ? t('manaCost', { symbols: symbols.map(manaSymbolName).join(', ') }) : '';
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
      accessibilityLabel={manaCostLabel(cost)}
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
