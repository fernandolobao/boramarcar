import { formatRules } from '@boramarcar/core/games';
import {
  defeatReason,
  rollDie,
  SEAT_COLORS,
  TABLE_COUNTERS,
  tableResult,
  tableRows,
  tableLayout,
  type TableAction,
  type TablePlayer,
  type TableState,
} from '@boramarcar/core/table';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Card, styles as ui } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { counterLabel, defeatLabel } from './labels';

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
function Rotated({ rotate, children }: { rotate: number; children: ReactNode }) {
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
          {children}
        </View>
      )}
    </View>
  );
}

function PlayerPanel({
  player,
  state,
  color,
  dispatch,
  onOpen,
}: {
  player: TablePlayer;
  state: TableState;
  color: string;
  dispatch: (action: TableAction) => void;
  onOpen: () => void;
}) {
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

  return (
    <View
      style={[board.panel, { backgroundColor: color, opacity: reason ? 0.55 : 1 }]}
      accessibilityLabel={t('tablePlayerArea', { name: player.name })}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tableOpenPlayer', { name: player.name })}
        onPress={onOpen}
        style={board.name}
        hitSlop={8}
      >
        <Text style={board.nameText} numberOfLines={1} maxFontSizeMultiplier={1.5}>
          {player.name} ⋯
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
            style={board.life}
            maxFontSizeMultiplier={1.2}
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
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View style={board.stepper}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Button
        label="−"
        variant="secondary"
        accessibilityLabel={t('tableDecrease', { label })}
        disabled={value <= 0}
        onPress={() => onChange(-1)}
        style={board.stepButton}
      />
      <AppText
        style={board.stepValue}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityLiveRegion="polite"
      >
        {value}
      </AppText>
      <Button
        label="+"
        variant="secondary"
        accessibilityLabel={t('tableIncrease', { label })}
        onPress={() => onChange(1)}
        style={board.stepButton}
      />
    </View>
  );
}

/** Folha de um jogador: dano de comandante por oponente, marcadores, monarca e desistir. */
function PlayerSheet({
  player,
  state,
  dispatch,
  onClose,
}: {
  player: TablePlayer;
  state: TableState;
  dispatch: (action: TableAction) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const usesCommander = formatRules(state.format).usesCommander;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <AppText accessibilityRole="header" style={ui.title}>
          {player.name}
        </AppText>
        {usesCommander && (
          <Card>
            <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
              {t('tableCommanderDamage')}
            </AppText>
            <AppText muted>{t('tableCommanderDamageHint')}</AppText>
            {state.players
              .filter((p) => p.userId !== player.userId)
              .map((p) => (
                <Stepper
                  key={p.userId}
                  label={t('tableFrom', { name: p.name })}
                  value={player.commanderDamage[p.userId] ?? 0}
                  onChange={(delta) =>
                    dispatch({
                      type: 'commander',
                      userId: player.userId,
                      fromUserId: p.userId,
                      delta,
                    })
                  }
                />
              ))}
          </Card>
        )}
        <Card>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('tableCountersTitle')}
          </AppText>
          {TABLE_COUNTERS.map((counter) => (
            <Stepper
              key={counter}
              label={counterLabel(counter)}
              value={player.counters[counter]}
              onChange={(delta) =>
                dispatch({ type: 'counter', userId: player.userId, counter, delta })
              }
            />
          ))}
        </Card>
        <View style={{ gap: 8 }}>
          <Button
            label={t('tableMonarch')}
            variant="secondary"
            accessibilityRole="switch"
            accessibilityState={{ checked: state.monarchId === player.userId }}
            selected={state.monarchId === player.userId}
            onPress={() =>
              dispatch({
                type: 'monarch',
                userId: state.monarchId === player.userId ? null : player.userId,
              })
            }
          />
          <Button
            label={t('tableConcede')}
            variant="secondary"
            accessibilityRole="switch"
            accessibilityState={{ checked: player.conceded }}
            selected={player.conceded}
            onPress={() =>
              dispatch({ type: 'concede', userId: player.userId, conceded: !player.conceded })
            }
          />
          <Button label={t('tableClose')} onPress={onClose} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Menu do centro: desfazer, d20, moeda, sortear quem começa, encerrar e sair. */
function TableMenu({
  state,
  dispatch,
  onFinish,
  onExit,
  onClose,
}: {
  state: TableState;
  dispatch: (action: TableAction) => void;
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
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const { winnerId } = tableResult(state);
  // Quando sobra um só na mesa, abre o menu para encerrar (como no site).
  const [lastWinner, setLastWinner] = useState(winnerId);
  if (winnerId !== lastWinner) {
    setLastWinner(winnerId);
    if (winnerId) {
      setOpen(null);
      setMenu(true);
    }
  }
  const layout = tableLayout(state.players.length);
  const openPlayer = state.players.find((p) => p.userId === open);

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <SafeAreaView style={{ flex: 1, gap: 4, padding: 4 }}>
        {tableRows(state.players.length).map((row, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {row.map((index) => {
              const player = state.players[index]!;
              return (
                <Rotated key={player.userId} rotate={layout.seats[index]!.rotate}>
                  <PlayerPanel
                    player={player}
                    state={state}
                    color={SEAT_COLORS[index % SEAT_COLORS.length]!}
                    dispatch={dispatch}
                    onOpen={() => setOpen(player.userId)}
                  />
                </Rotated>
              );
            })}
          </View>
        ))}
      </SafeAreaView>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, board.center]}>
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
      </View>
      <Modal
        visible={Boolean(openPlayer)}
        animationType="slide"
        onRequestClose={() => setOpen(null)}
      >
        {openPlayer && (
          <PlayerSheet
            player={openPlayer}
            state={state}
            dispatch={dispatch}
            onClose={() => setOpen(null)}
          />
        )}
      </Modal>
      <Modal visible={menu} animationType="slide" onRequestClose={() => setMenu(false)}>
        <TableMenu
          state={state}
          dispatch={dispatch}
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
  name: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  nameText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  lifeRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  half: { flex: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  sign: { color: '#ffffff', fontSize: 36, fontWeight: '700', opacity: 0.8 },
  lifeBox: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  life: { color: '#ffffff', fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 48, paddingHorizontal: 0 },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: '700' },
});
