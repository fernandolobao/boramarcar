import { DEFAULT_FLOW, normalizeFlow, sampleFlow, type FlowStop } from '@boramarcar/tokens/flow';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useColorScheme, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useReduceMotion } from './stack';

const TAU = Math.PI * 2;
const STRANDS = 44;
const SEGMENTS = 24;

const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r},${g},${b})`;

/**
 * Geometria da faixa (a mesma ideia do site, `components/mana-flow.tsx`): fios finos que descem
 * num "S" do alto à direita, torcendo como seda; a cor de cada fio corre pela paleta.
 */
function ribbon(width: number, height: number, stops: readonly FlowStop[]) {
  const palette = normalizeFlow(stops);
  const axisX = (s: number) =>
    width * (1.0 - 0.55 * (s * s * (3 - 2 * s)) + 0.05 * Math.sin(TAU * 0.55 * s));
  const axisY = (s: number) => height * (-0.05 + 1.1 * s);
  const bandWidth = (s: number) => width * (0.08 + 0.3 * (0.5 + 0.5 * Math.cos(TAU * 0.95 * s)));
  const twist = (s: number) => TAU * 1.1 * s + 0.9 * Math.sin(TAU * 0.5 * s);
  const axis = Array.from({ length: SEGMENTS + 1 }, (_, k) => {
    const s = k / SEGMENTS;
    const dx = axisX(Math.min(1, s + 0.01)) - axisX(Math.max(0, s - 0.01));
    const dy = axisY(Math.min(1, s + 0.01)) - axisY(Math.max(0, s - 0.01));
    const len = Math.hypot(dx, dy) || 1;
    return {
      s,
      x: axisX(s),
      y: axisY(s),
      nx: -dy / len,
      ny: dx / len,
      w: bandWidth(s),
      tw: twist(s),
    };
  });
  return Array.from({ length: STRANDS }, (_, j) => {
    const u = -1 + (2 * j) / (STRANDS - 1);
    const d = axis
      .map((p, k) => {
        const off = u * p.w * 0.5 * Math.cos(p.tw + u * 0.35);
        return `${k === 0 ? 'M' : 'L'}${(p.x + p.nx * off).toFixed(1)} ${(p.y + p.ny * off).toFixed(1)}`;
      })
      .join(' ');
    const colors = [0, 0.25, 0.5, 0.75, 1].map((s) =>
      rgb(sampleFlow(palette, u * 0.5 + s * 0.3 + 0.12 * Math.sin(twist(s)))),
    );
    return { d, colors, opacity: 0.55 + 0.45 * Math.abs(u) };
  });
}

/**
 * Fluxo de mana (como no site): fios iridescentes que descem pela lateral, nas cores da tela
 * (deck) ou no espectro padrão, com um balanço bem lento. Só decoração: fora da leitura de tela
 * e dos toques; parado com "reduzir movimento".
 */
export function Aura({ stops = DEFAULT_FLOW }: { stops?: FlowStop[] }) {
  const still = useReduceMotion();
  const dark = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();
  const key = JSON.stringify(stops);
  const strands = useMemo(() => ribbon(width, height, stops), [width, height, key]);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (still) {
      t.setValue(0.5);
      return;
    }
    const half = (toValue: number) =>
      Animated.timing(t, {
        toValue,
        duration: 24000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [t, still]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: dark ? 0.4 : 0.55,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [6, -10] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
            { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
        },
      ]}
    >
      <Svg width={width} height={height}>
        <Defs>
          {strands.map((strand, i) => (
            <LinearGradient key={i} id={`flow-${i}`} x1="0" y1="0" x2="0" y2="1">
              {strand.colors.map((color, k) => (
                <Stop key={k} offset={k / (strand.colors.length - 1)} stopColor={color} />
              ))}
            </LinearGradient>
          ))}
        </Defs>
        {strands.map((strand, i) => (
          <Path
            key={i}
            d={strand.d}
            stroke={`url(#flow-${i})`}
            strokeWidth={1.2}
            strokeOpacity={strand.opacity}
            fill="none"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
