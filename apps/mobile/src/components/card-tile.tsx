import { palette } from '@boramarcar/tokens';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from '@/components/stack';
import { AppText } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Proporção das cartas de Magic (63 × 88 mm). */
export const CARD_RATIO = 63 / 88;

/**
 * Carta numa grade (coleção e deck), com os selos no mesmo lugar do site: quantidade no canto de
 * cima à esquerda, proxy à direita e foil embaixo à esquerda. Sem imagem, mostra o nome.
 */
export function CardTile({
  name,
  imageUri,
  quantity,
  proxies = 0,
  foil = false,
  showName = false,
  accessibilityLabel,
  onPress,
}: {
  name: string;
  imageUri: string | null | undefined;
  quantity: number;
  proxies?: number;
  /** Tem cópia foil. */
  foil?: boolean;
  /** Nome embaixo da carta (coleção). */
  showName?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const badge = {
    position: 'absolute' as const,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          aspectRatio: CARD_RATIO,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: colors.surfaceMuted,
          justifyContent: 'center',
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
        ) : null}
        {imageUri && foil ? <FoilSheen /> : null}
        {imageUri ? null : (
          <AppText style={{ textAlign: 'center', fontSize: 12, padding: 6 }} numberOfLines={4}>
            {name}
          </AppText>
        )}
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ ...badge, left: 4, top: 4, backgroundColor: colors.badgeBg }}
        >
          <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.badgeText }}>
            ×{quantity}
          </AppText>
        </View>
        {proxies > 0 && (
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{ ...badge, right: 4, top: 4, backgroundColor: colors.accent }}
          >
            <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.onAccent }}>
              {proxies < quantity ? `${proxies} ${t('deckProxyTag')}` : t('deckProxyTag')}
            </AppText>
          </View>
        )}
        {foil && (
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{ ...badge, left: 6, bottom: '6%', backgroundColor: colors.foilBg }}
          >
            <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.foilText }}>
              ✦ {t('collectionFoil')}
            </AppText>
          </View>
        )}
      </View>
      {showName && (
        <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
          {name}
        </AppText>
      )}
    </Pressable>
  );
}

/** Grade de cartas em 3 colunas (a última linha completa com espaços vazios). */
export function CardGrid<T>({
  items,
  render,
  keyOf,
}: {
  items: readonly T[];
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <View key={row.map(keyOf).join('|')} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((item) => (
            <View key={keyOf(item)} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: 3 - row.length }, (_, i) => (
            <View key={`empty-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Uma faixa do brilho (uma largura de carta): dourado, mana e éter, como no site. */
const SHEEN_STOPS = [
  { offset: 0, color: palette.dourado, opacity: 0 },
  { offset: 0.25, color: palette.dourado, opacity: 0.45 },
  { offset: 0.4, color: palette.mana, opacity: 0.4 },
  { offset: 0.55, color: palette.eter, opacity: 0.45 },
  { offset: 0.8, color: palette.eter, opacity: 0 },
] as const;

/**
 * Brilho das cartas foil (decorativo, como `.foil-sheen` no site): a faixa repetida anda uma
 * largura de carta em loop, inclinada, e "respira" na opacidade com outro período. Cada carta tem
 * ritmo e atraso próprios; com "reduzir movimento", fica parado.
 */
function FoilSheen() {
  const reduce = useReduceMotion();
  // `useId` traz ":", que o `url(#…)` do SVG não aceita bem.
  const id = `foil${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const shift = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const rhythm = useMemo(
    () => ({
      shift: 9_000 + Math.random() * 4_000,
      breath: 6_000 + Math.random() * 2_000,
      delay: Math.random() * 3_000,
    }),
    [],
  );
  useEffect(() => {
    if (reduce || !width) return;
    const move = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: rhythm.shift,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: rhythm.breath,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: rhythm.breath,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const start = setTimeout(() => {
      move.start();
      pulse.start();
    }, rhythm.delay);
    return () => {
      clearTimeout(start);
      move.stop();
      pulse.stop();
    };
  }, [reduce, width, shift, breath, rhythm]);

  // Três faixas lado a lado; andar uma largura de carta fecha o ciclo sem emenda.
  const translateX = reduce
    ? -width * 0.7
    : shift.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });
  const opacity = reduce ? 1 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', mixBlendMode: 'color-dodge' }]}
    >
      {width > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: '-20%',
            bottom: '-20%',
            left: 0,
            width: width * 3,
            flexDirection: 'row',
            opacity,
            transform: [{ translateX }, { skewX: '-20deg' }],
          }}
        >
          {[0, 1, 2].map((i) => (
            <Svg key={i} width={width} height="100%">
              <Defs>
                <LinearGradient id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="0">
                  {SHEEN_STOPS.map((stop) => (
                    <Stop
                      key={stop.offset}
                      offset={stop.offset}
                      stopColor={stop.color}
                      stopOpacity={stop.opacity}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}-${i})`} />
            </Svg>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
