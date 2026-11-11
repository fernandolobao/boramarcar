import { palette } from '@boramarcar/tokens';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useColorScheme, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useReduceMotion } from './stack';

/** Formas desfocadas (degradê radial) nas cores da marca, cada uma com o próprio ritmo. */
const BLOBS = [
  { color: palette.eter, x: 210, y: 90, rx: 120, ry: 100, duration: 46000, dx: -18, dy: 12 },
  { color: palette.mana, x: 120, y: 160, rx: 90, ry: 80, duration: 52000, dx: 14, dy: -10 },
  { color: palette.dourado, x: 90, y: 60, rx: 70, ry: 62, duration: 40000, dx: 10, dy: 14 },
  { color: palette.arcano, x: 260, y: 200, rx: 80, ry: 70, duration: 58000, dx: -12, dy: -8 },
] as const;

function Blob({
  blob,
  index,
  still,
}: {
  blob: (typeof BLOBS)[number];
  index: number;
  still: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: blob.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: blob.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, still, blob.duration]);

  const id = `aura-${index}`;
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 300">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={blob.color} stopOpacity={0.9} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={blob.x} cy={blob.y} rx={blob.rx} ry={blob.ry} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Detalhes coloridos no canto superior direito (como no site): formas suaves nas cores da
 * marca que flutuam muito devagar. Só decoração: fora da leitura de tela e dos toques;
 * paradas com "reduzir movimento".
 */
export function Aura() {
  const still = useReduceMotion();
  const dark = useColorScheme() === 'dark';
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: -70,
        right: -90,
        width: 360,
        height: 300,
        opacity: dark ? 0.35 : 0.5,
      }}
    >
      {BLOBS.map((blob, i) => (
        <Blob key={blob.color} blob={blob} index={i} still={still} />
      ))}
    </View>
  );
}
