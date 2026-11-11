import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated, type ScrollViewProps } from 'react-native';
import { palette } from '@boramarcar/tokens';
import { AppText, styles } from '@/components/ui';
import { useColors } from '@/lib/theme';

/**
 * Seções em pilha de cartas (como no site): ao rolar, cada seção gruda um pouco abaixo da
 * anterior e a próxima desliza por cima, deixando à mostra só a faixa do título das de trás.
 * Feito com `translateY`/`opacity` ligados à rolagem no thread nativo.
 *
 * - A seção coberta esmaece e o conteúdo dela some (fica só o título): nada aparece "através"
 *   dos vãos entre as seções da frente.
 * - Seção mais alta que a tela não gruda: rola normal e leva junto a pilha anterior, como o fim
 *   dela; as seguintes começam uma pilha nova.
 * - Com "reduzir movimento", rola normal.
 */
const STACK_BASE = 8;
const STACK_STEP = 52;
const STACK_CAP = 4;
const BOTTOM_ROOM = 8;

interface Layout {
  y: number;
  height: number;
}
interface PlanItem {
  sticky: boolean;
  group: number;
  top: number;
}

/** Mesma regra do site (`stack-layout.ts`): quem cabe na tela gruda; quem não cabe rola. */
function planStack(layouts: readonly Layout[], viewport: number): PlanItem[] {
  const plan: PlanItem[] = [];
  let group = 0;
  let index = 0;
  layouts.forEach((layout, i) => {
    const top = STACK_BASE + Math.min(index, STACK_CAP) * STACK_STEP;
    if (layout.height > viewport - top - BOTTOM_ROOM) {
      if (i > 0 && index > 0) group += 1;
      plan.push({ sticky: false, group, top: STACK_BASE });
      group += 1;
      index = 0;
      return;
    }
    plan.push({ sticky: true, group, top });
    index += 1;
  });
  return plan;
}

interface StackState {
  scrollY: Animated.Value;
  enabled: boolean;
  layouts: (Layout | undefined)[];
  plan: PlanItem[] | null;
  report: (index: number, layout: Layout) => void;
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
  const [layouts, setLayouts] = useState<(Layout | undefined)[]>([]);
  const reduce = useReduceMotion();
  const report = useCallback((index: number, layout: Layout) => {
    setLayouts((all) => {
      const old = all[index];
      if (old && old.y === layout.y && old.height === layout.height) return all;
      const next = [...all];
      next[index] = layout;
      return next;
    });
  }, []);
  // Array.from: buracos (seção ainda sem medida) viram undefined e contam como incompletos.
  const complete = layouts.length > 0 && Array.from(layouts).every(Boolean);
  const plan = useMemo(
    () => (complete && viewport > 0 ? planStack(layouts as Layout[], viewport) : null),
    [complete, layouts, viewport],
  );
  return (
    <StackContext.Provider
      value={{ scrollY, enabled: !reduce && plan !== null, layouts, plan, report }}
    >
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

/** Rolagem em que o topo da seção chega a `top` na tela. */
const reachAt = (layout: Layout, top: number) => layout.y - top;

/** Uma seção da pilha, já desenhada como cartão, com o título sempre à mostra. */
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
  const report = stack?.report;

  let cardStyle: object = {};
  let bodyStyle: object = {};
  let fadeStyle: object | null = null;
  const layout = stack?.layouts[index];
  const item = stack?.plan?.[index];
  if (stack?.enabled && layout && item) {
    const plan = stack.plan!;
    const layouts = stack.layouts as Layout[];
    // Até onde a seção segue grudada: quando a primeira seção do grupo seguinte passa do ponto em
    // que grudaria neste grupo, o grupo inteiro sobe junto com ela.
    const nextGroupStart = plan.findIndex((p) => p.group > item.group);
    const lastOfGroup = nextGroupStart === -1 ? plan.length - 1 : nextGroupStart - 1;
    const start = reachAt(layout, item.top);
    const end =
      nextGroupStart === -1
        ? Number.MAX_SAFE_INTEGER / 2
        : reachAt(layouts[nextGroupStart]!, plan[lastOfGroup]!.top + STACK_STEP);
    if (item.sticky) {
      cardStyle = {
        transform: [
          {
            translateY: stack.scrollY.interpolate({
              inputRange: [start, Math.max(start + 1, end)],
              outputRange: [0, Math.max(1, end - start)],
              extrapolate: 'clamp',
            }),
          },
        ],
      };
    }
    // Coberta pela seguinte: de quando ela encosta no fim desta até chegar à faixa desta.
    const next = layouts[index + 1];
    if (next) {
      const from = reachAt(next, item.top + layout.height);
      const to = Math.max(from + 1, reachAt(next, item.top + STACK_STEP));
      bodyStyle = {
        opacity: stack.scrollY.interpolate({
          inputRange: [from, to],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
      };
      fadeStyle = {
        opacity: stack.scrollY.interpolate({
          inputRange: [from, to],
          outputRange: [0, 0.4],
          extrapolate: 'clamp',
        }),
      };
    }
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          gap: 8,
          zIndex: index + 1,
          elevation: index + 2,
          shadowColor: palette.noite,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        cardStyle,
      ]}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        report?.(index, { y, height });
      }}
    >
      <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
        {title}
      </AppText>
      <Animated.View style={[{ gap: 8 }, bodyStyle]}>{children}</Animated.View>
      {fadeStyle && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 16,
              backgroundColor: colors.background,
            },
            fadeStyle,
          ]}
        />
      )}
    </Animated.View>
  );
}
