import { formatRules } from '@boramarcar/core/games';
import {
  defeatReason,
  nextRotation,
  seatSwipe,
  rollDie,
  SEAT_COLORS,
  TABLE_COUNTERS,
  tableLayouts,
  tableResult,
  tableRows,
  tableLayout,
  type SeatRotation,
  type TableAction,
  type TableLayout,
  type TablePlayer,
  type TableState,
} from '@boramarcar/core/table';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, styles as ui } from '@/components/ui';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { counterLabel, defeatLabel } from './labels';
import { NumberField } from '@/components/ds/number-field';

/** Soma das mudanças recentes ("−3"), que some 1,5 s depois da última (como no Lotus). */
function useRecentDelta(value: number) {
  const [delta, setDelta] = useState(0);
  const previous = useRef(value);
  useEffect(() => {
    const change = value - previous.current;
    previous.current = value;
    if (!change) return;
    setDelta((d) => d + change);
    const timer = setTimeout(() => setDelta(0), 1500);
    return () => clearTimeout(timer);
  }, [value]);
  return delta;
}

/** Toque = ±1; segurar = ±10 e repete a cada 0,6 s enquanto o dedo estiver na tela. */
function useHold(onStep: (delta: number) => void, sign: 1 | -1) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPress: () => onStep(sign),
    onLongPress: () => {
      onStep(10 * sign);
      stop();
      timer.current = setInterval(() => onStep(10 * sign), 600);
    },
    onPressOut: stop,
    delayLongPress: 500,
  };
}

/** Área girada para quem senta daquele lado da mesa (90°/270° trocam largura e altura). */
function Rotated({
  rotate,
  children,
}: {
  rotate: number;
  /** Recebe o tamanho da área já girada (largura e altura do ponto de vista do jogador). */
  children: (size: { w: number; h: number }) => ReactNode;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sideways = rotate === 90 || rotate === 270;
  const w = sideways ? size.h : size.w;
  const h = sideways ? size.w : size.h;
  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <View
          style={{
            position: 'absolute',
            width: w,
            height: h,
            left: (size.w - w) / 2,
            top: (size.h - h) / 2,
            transform: [{ rotate: `${rotate}deg` }],
          }}
        >
          {children({ w, h })}
        </View>
      )}
    </View>
  );
}

/**
 * Opções do jogador dentro da própria área (como no Lotus), já viradas para ele: dano de
 * comandante por oponente, marcadores, monarca, desistir e girar a área.
 */
function PlayerOptions({
  player,
  state,
  seat,
  rotate,
  dispatch,
  onClose,
}: {
  player: TablePlayer;
  state: TableState;
  seat: number;
  rotate: SeatRotation;
  dispatch: (action: TableAction) => void;
  onClose: () => void;
}) {
  const usesCommander = formatRules(state.format).usesCommander;
  const toggle = (label: string, on: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [
        board.panelToggle,
        on && board.panelToggleOn,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[board.panelToggleText, on && board.panelToggleTextOn]}
        maxFontSizeMultiplier={1.4}
      >
        {on ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
  return (
    <View style={[StyleSheet.absoluteFill, board.options]} accessibilityViewIsModal>
      <View style={board.optionsHeader}>
        <Text style={board.optionsTitle} numberOfLines={1} accessibilityRole="header">
          {player.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tableOptionsClose', { name: player.name })}
          onPress={onClose}
          hitSlop={8}
          style={board.optionsClose}
        >
          <Text style={board.optionsCloseText}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
        {usesCommander && (
          <View style={{ gap: 6 }}>
            <Text style={board.panelSection}>{t('tableCommanderDamage')}</Text>
            {state.players
              .filter((p) => p.userId !== player.userId)
              .map((p) => (
                <NumberField
                  key={p.userId}
                  tone="onDark"
                  compact
                  min={0}
                  label={t('tableFrom', { name: p.name })}
                  value={player.commanderDamage[p.userId] ?? 0}
                  onChange={(v) =>
                    dispatch({
                      type: 'commander',
                      userId: player.userId,
                      fromUserId: p.userId,
                      delta: (v ?? 0) - (player.commanderDamage[p.userId] ?? 0),
                    })
                  }
                />
              ))}
          </View>
        )}
        <View style={{ gap: 6 }}>
          <Text style={board.panelSection}>{t('tableCountersTitle')}</Text>
          {TABLE_COUNTERS.map((counter) => (
            <NumberField
              key={counter}
              tone="onDark"
              compact
              min={0}
              label={counterLabel(counter)}
              value={player.counters[counter]}
              onChange={(v) =>
                dispatch({
                  type: 'counter',
                  userId: player.userId,
                  counter,
                  delta: (v ?? 0) - player.counters[counter],
                })
              }
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {toggle(t('tableMonarch'), state.monarchId === player.userId, () =>
            dispatch({
              type: 'monarch',
              userId: state.monarchId === player.userId ? null : player.userId,
            }),
          )}
          {toggle(t('tableConcede'), player.conceded, () =>
            dispatch({ type: 'concede', userId: player.userId, conceded: !player.conceded }),
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tableRotateArea', { name: player.name })}
            onPress={() => dispatch({ type: 'rotate', seat, rotate: nextRotation(rotate) })}
            style={({ pressed }) => [board.panelToggle, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={board.panelToggleText} maxFontSizeMultiplier={1.4}>
              ⟳ {t('tableRotate')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function PlayerPanel({
  player,
  state,
  color,
  size,
  seat,
  rotate,
  swap,
  dispatch,
}: {
  player: TablePlayer;
  state: TableState;
  color: string;
  size: { w: number; h: number };
  /** Posição na mesa (índice no estado) e rotação atual da área. */
  seat: number;
  rotate: SeatRotation;
  /** Modo "trocar lugares": a área inteira vira um botão para escolher o jogador. */
  swap: { selected: boolean; onPick: () => void } | null;
  dispatch: (action: TableAction) => void;
}) {
  const [options, setOptions] = useState(false);
  const onOpen = () => setOptions(true);
  // Deslizar para cima (do lado do jogador) abre as opções; para baixo fecha.
  const rotateRef = useRef(rotate);
  rotateRef.current = rotate;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Só toma o toque (dos botões de vida) quando o gesto já é claramente "para cima/baixo".
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          seatSwipe(g.dx, g.dy, rotateRef.current, 24) !== null,
        onPanResponderRelease: (_e, g) => {
          const direction = seatSwipe(g.dx, g.dy, rotateRef.current);
          if (direction === 'up') setOptions(true);
          else if (direction === 'down') setOptions(false);
        },
      }),
    [],
  );
  const step = (delta: number) => {
    void Haptics.selectionAsync();
    dispatch({ type: 'life', userId: player.userId, delta });
  };
  const minus = useHold(step, -1);
  const plus = useHold(step, 1);
  const delta = useRecentDelta(player.life);
  const reason = defeatReason(player, state.format);
  const badges = [
    state.monarchId === player.userId && t('tableMonarch'),
    state.firstPlayerId === player.userId && t('tableFirst'),
    ...TABLE_COUNTERS.filter((c) => player.counters[c] > 0).map(
      (c) => `${counterLabel(c)} ${player.counters[c]}`,
    ),
  ].filter((b): b is string => Boolean(b));
  // A vida ocupa o meio da área (metade da largura, até 3 dígitos), em qualquer tamanho de mesa.
  const lifeSize = Math.round(Math.max(28, Math.min(96, size.h * 0.4, size.w * 0.26)));

  return (
    <View
      style={[board.panel, { backgroundColor: color, opacity: reason && !options ? 0.55 : 1 }]}
      accessibilityLabel={t('tablePlayerArea', { name: player.name })}
      accessibilityHint={t('tableSwipeHint')}
      {...(swap ? {} : swipe.panHandlers)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tableOpenPlayer', { name: player.name })}
        onPress={onOpen}
        style={board.name}
        hitSlop={8}
      >
        <Text style={board.nameText} numberOfLines={1} maxFontSizeMultiplier={1.5}>
          {player.name} ⌃
        </Text>
      </Pressable>
      <View style={board.lifeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tableLifeDown', { name: player.name, life: player.life })}
          style={board.half}
          {...minus}
        >
          <Text style={board.sign} importantForAccessibility="no">
            −
          </Text>
        </Pressable>
        <View
          pointerEvents="none"
          style={board.lifeBox}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('tableLifeStatus', { name: player.name, life: player.life })}
        >
          <Text
            style={[board.life, { fontSize: lifeSize, lineHeight: Math.round(lifeSize * 1.1) }]}
            allowFontScaling={false}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {player.life}
          </Text>
          <Text style={board.delta} maxFontSizeMultiplier={1.2}>
            {delta ? (delta > 0 ? `+${delta}` : `−${-delta}`) : ' '}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tableLifeUp', { name: player.name, life: player.life })}
          style={board.half}
          {...plus}
        >
          <Text style={board.sign} importantForAccessibility="no">
            +
          </Text>
        </Pressable>
      </View>
      <Text style={board.badges} numberOfLines={2} maxFontSizeMultiplier={1.5}>
        {reason ? defeatLabel(reason) : badges.join(' · ') || ' '}
      </Text>
      {options && !swap && (
        <PlayerOptions
          player={player}
          state={state}
          seat={seat}
          rotate={rotate}
          dispatch={dispatch}
          onClose={() => setOptions(false)}
        />
      )}
      {swap && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: swap.selected }}
          accessibilityLabel={t(swap.selected ? 'tableSwapSelected' : 'tableSwapPick', {
            name: player.name,
          })}
          onPress={swap.onPick}
          style={[
            StyleSheet.absoluteFill,
            board.swap,
            swap.selected && { borderColor: '#ffffff', backgroundColor: 'rgba(0,0,0,0.4)' },
          ]}
        >
          <Text style={board.swapText} maxFontSizeMultiplier={1.5}>
            {swap.selected ? `✓ ${player.name}` : `⇄ ${player.name}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const SIDE_LABEL: Record<SeatRotation, MessageKey> = {
  180: 'tableSideTop',
  270: 'tableSideRight',
  0: 'tableSideBottom',
  90: 'tableSideLeft',
};

/** Miniatura de uma disposição: as áreas com "40" virado para o lado de cada jogador. */
function LayoutPreview({
  layout,
  count,
  selected,
  index,
  onPick,
}: {
  layout: TableLayout;
  count: number;
  selected: boolean;
  index: number;
  onPick: () => void;
}) {
  const colors = useColors();
  const rows = tableRows(count, layout);
  const sides = layout.seats.map((s) => t(SIDE_LABEL[s.rotate])).join(', ');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={t('tableLayoutOption', { number: index + 1, sides })}
      onPress={onPick}
      style={({ pressed }) => [
        board.preview,
        { borderColor: selected ? colors.brand : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 3 }} importantForAccessibility="no-hide-descendants">
        {rows.map((row, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {row.map((i) => (
              <View
                key={i}
                style={[
                  board.previewCell,
                  { backgroundColor: SEAT_COLORS[i % SEAT_COLORS.length] },
                ]}
              >
                <Text
                  style={[
                    board.previewText,
                    { transform: [{ rotate: `${layout.seats[i]!.rotate}deg` }] },
                  ]}
                  allowFontScaling={false}
                >
                  40
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/** Menu do centro: desfazer, d20, moeda, sortear quem começa, encerrar e sair. */
function TableMenu({
  state,
  dispatch,
  onSwap,
  onFinish,
  onExit,
  onClose,
}: {
  state: TableState;
  dispatch: (action: TableAction) => void;
  onSwap: () => void;
  onFinish: () => void;
  onExit: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [result, setResult] = useState('');
  const { winnerId } = tableResult(state);
  const winner = state.players.find((p) => p.userId === winnerId);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <AppText accessibilityRole="header" style={ui.title}>
          {t('tableMenu')}
        </AppText>
        {winner && (
          <AppText
            accessibilityRole="alert"
            style={{ fontWeight: '700', fontSize: 18, color: colors.success }}
          >
            {t('tableWinnerFound', { name: winner.name })}
          </AppText>
        )}
        <AppText
          accessibilityLiveRegion="polite"
          style={{ fontSize: 20, fontWeight: '700', minHeight: 28 }}
        >
          {result}
        </AppText>
        <Button
          label={t('tableUndo')}
          variant="secondary"
          disabled={state.undo.length === 0}
          onPress={() => dispatch({ type: 'undo' })}
        />
        <Button
          label={t('tableRollD20')}
          variant="secondary"
          onPress={() => setResult(t('tableRolled', { value: rollDie(20) }))}
        />
        <Button
          label={t('tableFlipCoin')}
          variant="secondary"
          onPress={() => setResult(rollDie(2) === 1 ? t('tableHeads') : t('tableTails'))}
        />
        <Button
          label={t('tablePickFirst')}
          variant="secondary"
          onPress={() => {
            const p = state.players[rollDie(state.players.length) - 1]!;
            dispatch({ type: 'first', userId: p.userId });
            setResult(t('tableFirstIs', { name: p.name }));
          }}
        />
        <Button
          label={t('tableSwap')}
          variant="secondary"
          accessibilityHint={t('tableSwapHint')}
          onPress={onSwap}
        />
        <View style={{ gap: 8, paddingVertical: 4 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('tableLayoutTitle')}
          </AppText>
          <AppText muted>{t('tableLayoutHint')}</AppText>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('tableLayoutTitle')}
          >
            {tableLayouts(state.players.length).map((layout, i) => (
              <LayoutPreview
                key={layout.id}
                layout={layout}
                count={state.players.length}
                index={i}
                selected={
                  (state.layoutId ?? tableLayouts(state.players.length)[0]!.id) === layout.id
                }
                onPick={() => dispatch({ type: 'layout', layoutId: layout.id })}
              />
            ))}
          </View>
          {Object.keys(state.rotations ?? {}).length > 0 && (
            <Button
              label={t('tableLayoutResetRotations')}
              variant="secondary"
              onPress={() =>
                dispatch({
                  type: 'layout',
                  layoutId: state.layoutId ?? tableLayouts(state.players.length)[0]!.id,
                })
              }
            />
          )}
        </View>
        <Button label={t('tableFinish')} onPress={onFinish} />
        <Button label={t('tableExit')} variant="secondary" onPress={onExit} />
        <AppText muted>{t('tableExitHint')}</AppText>
        <Button label={t('tableClose')} variant="secondary" onPress={onClose} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** O tabuleiro: uma área por jogador, viradas para os lados da mesa, e o menu no centro. */
export function TableBoard({
  state,
  dispatch,
  onFinish,
  onExit,
}: {
  state: TableState;
  dispatch: (action: TableAction) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const [menu, setMenu] = useState(false);
  /** Trocar lugares: `null` = desligado; `''` = escolhendo o primeiro; id = primeiro escolhido. */
  const [swapping, setSwapping] = useState<string | null>(null);
  const [swapMessage, setSwapMessage] = useState('');
  const pickSwap = (userId: string) => {
    if (!swapping) return setSwapping(userId);
    if (swapping === userId) return setSwapping('');
    const a = state.players.find((p) => p.userId === swapping)!;
    const b = state.players.find((p) => p.userId === userId)!;
    dispatch({ type: 'swap', userId: swapping, withUserId: userId });
    setSwapMessage(t('tableSwapped', { a: a.name, b: b.name }));
    setSwapping(null);
  };
  const { winnerId } = tableResult(state);
  // Quando sobra um só na mesa, abre o menu para encerrar (como no site).
  const [lastWinner, setLastWinner] = useState(winnerId);
  if (winnerId !== lastWinner) {
    setLastWinner(winnerId);
    if (winnerId) {
      setMenu(true);
    }
  }
  const layout = tableLayout(state.players.length, state.layoutId, state.rotations);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#09090b' }]}>
      <SafeAreaView style={{ flex: 1, gap: 4, padding: 4 }}>
        {tableRows(state.players.length, layout).map((row, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {row.map((index) => {
              const player = state.players[index]!;
              return (
                <Rotated key={player.userId} rotate={layout.seats[index]!.rotate}>
                  {(size) => (
                    <PlayerPanel
                      player={player}
                      state={state}
                      color={SEAT_COLORS[index % SEAT_COLORS.length]!}
                      size={size}
                      seat={index}
                      rotate={layout.seats[index]!.rotate}
                      swap={
                        swapping === null
                          ? null
                          : {
                              selected: swapping === player.userId,
                              onPick: () => pickSwap(player.userId),
                            }
                      }
                      dispatch={dispatch}
                    />
                  )}
                </Rotated>
              );
            })}
          </View>
        ))}
      </SafeAreaView>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, board.center]}>
        {swapping === null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tableMenu')}
            onPress={() => setMenu(true)}
            style={board.menuButton}
          >
            <Text style={board.menuText} importantForAccessibility="no">
              ☰
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSwapping(null)}
            style={board.swapDone}
          >
            <Text style={board.swapDoneText} maxFontSizeMultiplier={1.5}>
              {t('tableSwapCancel')}
            </Text>
          </Pressable>
        )}
      </View>
      <Text
        style={board.srOnly}
        accessibilityLiveRegion="polite"
        accessibilityElementsHidden={!swapMessage}
      >
        {swapMessage}
      </Text>
      <Modal visible={menu} animationType="slide" onRequestClose={() => setMenu(false)}>
        <TableMenu
          state={state}
          dispatch={dispatch}
          onSwap={() => {
            setMenu(false);
            setSwapMessage(t('tableSwapHint'));
            setSwapping('');
          }}
          onFinish={() => {
            setMenu(false);
            onFinish();
          }}
          onExit={() => {
            setMenu(false);
            onExit();
          }}
          onClose={() => setMenu(false)}
        />
      </Modal>
    </View>
  );
}

const board = StyleSheet.create({
  panel: { flex: 1, borderRadius: 18, padding: 8, justifyContent: 'space-between' },
  // Nome no canto (do ponto de vista do jogador), longe do botão central da mesa.
  name: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12 },
  nameText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  lifeRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  half: { flex: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  sign: { color: '#ffffff', fontSize: 36, fontWeight: '700', opacity: 0.8 },
  lifeBox: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  life: { color: '#ffffff', fontWeight: '800', fontVariant: ['tabular-nums'] },
  delta: { color: '#ffffff', fontSize: 20, fontWeight: '700', minHeight: 26 },
  badges: { color: '#ffffff', fontSize: 14, textAlign: 'center', minHeight: 20 },
  center: { alignItems: 'center', justifyContent: 'center' },
  menuButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#09090b',
  },
  menuText: { fontSize: 26, color: '#09090b', fontWeight: '700' },
  swap: {
    borderRadius: 18,
    borderWidth: 4,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  swapDone: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#09090b',
  },
  swapDoneText: { color: '#09090b', fontSize: 16, fontWeight: '700' },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  options: {
    borderRadius: 18,
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(9,9,11,0.92)',
  },
  optionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionsTitle: { flex: 1, color: '#ffffff', fontSize: 18, fontWeight: '800' },
  optionsClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  optionsCloseText: { color: '#ffffff', fontSize: 26, fontWeight: '700', lineHeight: 28 },
  panelSection: { color: '#ffffff', fontSize: 13, fontWeight: '800', opacity: 0.8 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelLabel: { flex: 1, color: '#ffffff', fontSize: 15 },
  panelStep: {
    width: 44,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  panelStepText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  panelValue: {
    minWidth: 32,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  panelToggle: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  panelToggleOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  panelToggleText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  panelToggleTextOn: { color: '#09090b' },
  preview: { width: 84, height: 112, padding: 4, borderRadius: 12, borderWidth: 3 },
  previewCell: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  previewText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 48, paddingHorizontal: 0 },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: '700' },
});
