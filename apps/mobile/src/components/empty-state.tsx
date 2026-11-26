import { palette } from '@boramarcar/tokens';
import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ManaSymbol } from '@/components/mana';
import { AppText } from '@/components/ui';

/**
 * Estado vazio com cara de ArcanaKin, como no site: os cinco símbolos de mana (decorativos) sobre
 * um brilho violeta suave, o texto e, se houver, uma ação. O texto é o conteúdo; os símbolos são
 * só enfeite.
 */
export function EmptyState({
  children,
  action,
  symbols = ['W', 'U', 'B', 'R', 'G'],
}: {
  children: ReactNode;
  action?: ReactNode;
  symbols?: readonly string[];
}) {
  // `useId` traz ":", que o `url(#…)` do SVG não aceita bem.
  const id = `empty${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={s.box}>
      <Svg style={StyleSheet.absoluteFill} accessibilityElementsHidden>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="0%" rx="60%" ry="90%">
            <Stop offset="0" stopColor={palette.eter} stopOpacity={0.12} />
            <Stop offset="1" stopColor={palette.eter} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View
        style={{ flexDirection: 'row', gap: 6 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {symbols.map((symbol, i) => (
          <ManaSymbol key={`${symbol}-${i}`} symbol={symbol} size={24} />
        ))}
      </View>
      {typeof children === 'string' ? (
        <AppText muted style={{ textAlign: 'center' }}>
          {children}
        </AppText>
      ) : (
        children
      )}
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
