import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Um período do brilho (repetido duas vezes, para o laço não ter emenda). */
const STOPS: [number, string, number][] = [
  [0, '#ffffff', 0.15],
  [0.11, '#ffffff', 0.55],
  [0.18, '#ffd678', 0.5],
  [0.25, '#be96ff', 0.5],
  [0.32, '#78dcff', 0.5],
  [0.39, '#ffffff', 0.55],
  [0.5, '#ffffff', 0.15],
];

/**
 * Sorteado para começar (como no site): brilho de carta foil correndo pela área, com o aviso
 * "Você começa!" virado para o jogador. Decorativo (o sorteio é anunciado em texto pela mesa);
 * com "reduzir movimento", o brilho fica parado.
 */
export function Spotlight({ label }: { label: string }) {
  const shift = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    let alive = true;
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive || reduce) return;
      loop = Animated.loop(
        Animated.timing(shift, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    });
    return () => {
      alive = false;
      loop?.stop();
    };
  }, [shift]);
  const translateX = shift.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, styles.frame]}
    >
      {width > 0 && (
        <Animated.View style={[styles.sheen, { width: width * 2, transform: [{ translateX }] }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="foil" x1="0" y1="0" x2="1" y2="0.25">
                {[0, 0.5].flatMap((base) =>
                  STOPS.map(([at, color, opacity]) => (
                    <Stop
                      key={`${base}-${at}`}
                      offset={base + at}
                      stopColor={color}
                      stopOpacity={opacity}
                    />
                  )),
                )}
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#foil)" />
          </Svg>
        </Animated.View>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText} maxFontSizeMultiplier={1.4}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    // O mesmo canto da área do jogador (`board.panel`).
    borderRadius: 18,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheen: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: { color: '#0b0716', fontSize: 18, fontWeight: '800' },
});
