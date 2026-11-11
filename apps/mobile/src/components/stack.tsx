import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, type ScrollViewProps } from 'react-native';
import { palette } from '@boramarcar/tokens';
import { AppText, styles } from '@/components/ui';
import { useColors } from '@/lib/theme';

/**
 * Seções em pilha de cartas (como no site): ao rolar, cada seção gruda um pouco abaixo da
 * anterior e a próxima desliza por cima, deixando à mostra o título das de trás. Feito com
 * `translateY` ligado à rolagem no thread nativo. Com "reduzir movimento", rola normal.
 */
const STACK_BASE = 8;
const STACK_STEP = 52;
const STACK_CAP = 4;

interface StackState {
  scrollY: Animated.Value;
  viewport: number;
  enabled: boolean;
}
const StackContext = createContext<StackState | null>(null);

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** ScrollView que empilha as `StackSection` de dentro (filhos diretos do conteúdo). */
export function StackScrollView({ children, ...props }: ScrollViewProps & { children: ReactNode }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [viewport, setViewport] = useState(0);
  const reduce = useReduceMotion();
  return (
    <StackContext.Provider value={{ scrollY, viewport, enabled: !reduce && viewport > 0 }}>
      <Animated.ScrollView
        {...props}
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </StackContext.Provider>
  );
}

/**
 * Uma seção da pilha, já desenhada como cartão. O título gruda na faixa da seção (vale para
 * seções mais altas que a tela); o resto passa por baixo dele.
 */
export function StackSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  const colors = useColors();
  const stack = useContext(StackContext);
  const [layout, setLayout] = useState<{ y: number; height: number } | null>(null);
  const top = STACK_BASE + Math.min(index, STACK_CAP) * STACK_STEP;

  let cardStyle: object = {};
  let titleStyle: object = {};
  if (stack?.enabled && layout) {
    // Seção mais alta que a tela gruda pelo fim, para nada ficar escondido.
    const stickTop = Math.min(top, stack.viewport - layout.height - 8);
    const start = layout.y - stickTop;
    const card = stack.scrollY.interpolate({
      inputRange: [start, start + 1],
      outputRange: [0, 1],
      extrapolateLeft: 'clamp',
      extrapolateRight: 'extend',
    });
    // Quanto o título precisa descer dentro do cartão para ficar na faixa da seção.
    const room = Math.max(1, layout.height - 64);
    const follow = Animated.subtract(
      stack.scrollY.interpolate({
        inputRange: [layout.y - top, layout.y - top + 1],
        outputRange: [0, 1],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      }),
      card,
    ).interpolate({ inputRange: [0, room], outputRange: [0, room], extrapolate: 'clamp' });
    cardStyle = { transform: [{ translateY: card }], zIndex: index + 1, elevation: index + 2 };
    titleStyle = { transform: [{ translateY: follow }], zIndex: 1 };
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          gap: 8,
          shadowColor: palette.noite,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        cardStyle,
      ]}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        if (!layout || layout.y !== y || layout.height !== height) setLayout({ y, height });
      }}
    >
      <Animated.View style={[{ backgroundColor: colors.surface, paddingVertical: 2 }, titleStyle]}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {title}
        </AppText>
      </Animated.View>
      {children}
    </Animated.View>
  );
}
