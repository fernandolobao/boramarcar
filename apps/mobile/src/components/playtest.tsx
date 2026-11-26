import {
  commanderTax,
  manaAvailable,
  playtest,
  startPlaytest,
  type PlaytestAction,
  type PlaytestCard,
  type PlaytestLine,
  type PlaytestState,
  type PlaytestZone,
} from '@boramarcar/core/decks';
import { GLOSSARY, glossaryKeywordsIn, LEARN, type LessonId } from '@boramarcar/core/learn';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField } from '@/components/fields';
import { ManaCost, ManaSymbol, ManaText } from '@/components/mana';
import { SplitColumns } from '@/components/split-columns';
import { AppText, Button, Card, styles } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { locale, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const CARD_RATIO = 63 / 88;
const SIZE_LABEL = { small: 'ptSizeSmall', medium: 'ptSizeMedium', large: 'ptSizeLarge' } as const;
const learnLocale = locale === 'en' ? 'en' : 'pt-BR';
const site = (path: string) => `${API_URL.replace(/\/+$/, '')}${path}`;
const openSite = (path: string) => void WebBrowser.openBrowserAsync(site(path));
const lessonTitle = (id: LessonId) =>
  LEARN[learnLocale].lessons.find((l) => l.id === id)?.title ?? id;

type Target = PlaytestZone | 'libraryTop' | 'libraryBottom';
const ZONE_LABEL: Record<Target, MessageKey> = {
  library: 'ptZoneLibrary',
  libraryTop: 'ptZoneLibraryTop',
  libraryBottom: 'ptZoneLibraryBottom',
  hand: 'ptZoneHand',
  battlefield: 'ptZoneBattlefield',
  graveyard: 'ptZoneGraveyard',
  exile: 'ptZoneExile',
  command: 'ptZoneCommand',
};

/** Para onde a carta pode ir, a partir da zona em que está (igual ao site). */
function targetsFor(card: PlaytestCard, zone: PlaytestZone): Target[] {
  if (zone === 'command') return ['battlefield'];
  const all: Target[] = [
    'battlefield',
    'hand',
    'graveyard',
    'exile',
    'libraryTop',
    'libraryBottom',
  ];
  const list = all.filter((x) => x !== zone);
  if (card.isCommander) list.push('command');
  return card.isToken ? list.filter((x) => x !== 'libraryTop' && x !== 'libraryBottom') : list;
}

/** Avisos da trilha dispensados neste aparelho. */
const HINTS_KEY = 'arcanakin.playtest-hints';
type HintId = 'turn' | 'mana' | 'tax';
function useDismissedHints() {
  const [dismissed, setDismissed] = useState<HintId[]>([]);
  useEffect(() => {
    let alive = true;
    void SecureStore.getItemAsync(HINTS_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as unknown) : [];
        if (alive && Array.isArray(saved)) setDismissed(saved as HintId[]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const dismiss = (id: HintId) =>
    setDismissed((list) => {
      const next = [...new Set([...list, id])];
      void SecureStore.setItemAsync(HINTS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  return { dismissed, dismiss };
}

/** Tamanho das cartas na mesa (largura em pt), escolhido pela pessoa e guardado no aparelho. */
const CARD_WIDTH = { small: 86, medium: 120, large: 160 } as const;
type CardSize = keyof typeof CARD_WIDTH;
const SIZE_KEY = 'arcanakin.playtest-size';
function useCardSize() {
  const [size, setSize] = useState<CardSize>('medium');
  useEffect(() => {
    let alive = true;
    void SecureStore.getItemAsync(SIZE_KEY)
      .then((saved) => {
        if (alive && (saved === 'small' || saved === 'large')) setSize(saved);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const choose = (next: CardSize) => {
    setSize(next);
    void SecureStore.setItemAsync(SIZE_KEY, next).catch(() => undefined);
  };
  return [size, choose] as const;
}

/** "?" ao lado de um termo: mostra a definição do glossário, com o link para o site. */
function TermHelp({ id }: { id: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY.find((e) => e.id === id);
  if (!entry) return null;
  const text = entry[learnLocale];
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ptWhatIs', { term: text.term })}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText style={{ fontWeight: '700', color: colors.link }}>?</AppText>
      </Pressable>
      {open && (
        <View style={{ gap: 4, maxWidth: 360 }}>
          <AppText>
            <AppText style={{ fontWeight: '700' }}>{text.term}: </AppText>
            {text.text}
          </AppText>
          <Pressable
            accessibilityRole="link"
            onPress={() => openSite(`/aprender/glossario#${entry.id}`)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <AppText style={{ color: colors.link, fontWeight: '600' }}>{t('ptInGlossary')}</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Hint({
  text,
  links,
  onDismiss,
}: {
  text: string;
  links: { label: string; path: string }[];
  onDismiss: () => void;
}) {
  const colors = useColors();
  return (
    <Card style={{ gap: 8 }}>
      <AppText>{text}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {links.map((l) => (
          <Pressable
            key={l.path}
            accessibilityRole="link"
            onPress={() => openSite(l.path)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <AppText style={{ color: colors.link, fontWeight: '600' }}>{l.label}</AppText>
          </Pressable>
        ))}
        <Button label={t('ptGotIt')} variant="secondary" onPress={onDismiss} />
      </View>
    </Card>
  );
}

/** A carta na mesa (virada, se estiver): imagem ou o nome. */
function CardFace({ card, width }: { card: PlaytestCard; width: number }) {
  const colors = useColors();
  return (
    // Virada: gira e encolhe para caber no mesmo espaço (sem cobrir as vizinhas).
    <View style={{ width, transform: card.tapped ? [{ rotate: '90deg' }, { scale: 0.72 }] : [] }}>
      {card.imageUri ? (
        <Image
          source={{ uri: card.imageUri }}
          accessible={false}
          style={{ width, aspectRatio: CARD_RATIO, borderRadius: 8 }}
        />
      ) : (
        <View
          style={{
            width,
            aspectRatio: CARD_RATIO,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <AppText style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={4}>
            {card.name}
          </AppText>
        </View>
      )}
    </View>
  );
}

function Zone({
  title,
  count,
  term,
  action,
  children,
}: {
  title: string;
  count: number;
  term?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
        <AppText accessibilityRole="header" style={[styles.sectionTitle, { flex: 1 }]}>
          {title} ({count})
        </AppText>
        {term && <TermHelp id={term} />}
      </View>
      {action}
      {count === 0 ? (
        <AppText muted>{t('ptEmptyZone')}</AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
      )}
    </Card>
  );
}

/** Janela da carta: imagem, texto, palavras-chave (glossário) e as ações. */
function CardSheet({
  card,
  zone,
  note,
  onClose,
  onMove,
  onTap,
}: {
  card: PlaytestCard | null;
  zone: PlaytestZone | null;
  note?: string;
  onClose: () => void;
  onMove: (to: Target) => void;
  onTap?: () => void;
}) {
  const colors = useColors();
  const keywords = card ? glossaryKeywordsIn(card.oracleText, learnLocale) : [];
  return (
    <Modal visible={card !== null} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {card && zone && (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <AppText accessibilityRole="header" style={styles.title}>
              {card.name}
            </AppText>
            {card.imageUri ? (
              <Image
                source={{ uri: card.imageUri }}
                accessible={false}
                style={{ width: '70%', maxWidth: 320, aspectRatio: CARD_RATIO, borderRadius: 12 }}
              />
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <AppText muted>{card.typeLine}</AppText>
              <ManaCost cost={card.manaCost} />
            </View>
            {note ? <AppText style={{ fontWeight: '700' }}>{note}</AppText> : null}
            {card.oracleText ? <ManaText text={card.oracleText} /> : null}
            {keywords.length > 0 && (
              <Card style={{ gap: 8 }}>
                <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
                  {t('ptKeywords')}
                </AppText>
                {keywords.map((k) => (
                  <View key={k.id} style={{ gap: 2 }}>
                    <AppText>
                      <AppText style={{ fontWeight: '700' }}>{k.term}: </AppText>
                      {k.text}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`${t('ptInGlossary')}: ${k.term}`}
                        onPress={() => openSite(`/aprender/glossario#${k.id}`)}
                        style={{ minHeight: 44, justifyContent: 'center' }}
                      >
                        <AppText style={{ color: colors.link, fontWeight: '600' }}>
                          {t('ptInGlossary')}
                        </AppText>
                      </Pressable>
                      {k.lesson && (
                        <Pressable
                          accessibilityRole="link"
                          onPress={() => openSite(`/aprender/${k.lesson}`)}
                          style={{ minHeight: 44, justifyContent: 'center' }}
                        >
                          <AppText style={{ color: colors.link, fontWeight: '600' }}>
                            {t('ptLesson', { title: lessonTitle(k.lesson) })}
                          </AppText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </Card>
            )}
            <View style={{ gap: 8 }}>
              {onTap && (
                <Button
                  label={t(card.tapped ? 'ptUntap' : 'ptTap')}
                  icon="flip"
                  onPress={() => {
                    onTap();
                    onClose();
                  }}
                />
              )}
              {targetsFor(card, zone).map((to) => (
                <Button
                  key={to}
                  label={
                    zone === 'hand' && to === 'battlefield'
                      ? t('ptPlay')
                      : t('ptMoveTo', { zone: t(ZONE_LABEL[to]) })
                  }
                  variant={zone === 'hand' && to === 'battlefield' ? 'primary' : 'secondary'}
                  onPress={() => {
                    onMove(to);
                    onClose();
                  }}
                />
              ))}
              <Button label={t('deckClose')} variant="secondary" onPress={onClose} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function SearchSheet({
  open,
  library,
  onPick,
  onClose,
}: {
  open: boolean;
  library: PlaytestCard[];
  onPick: (card: PlaytestCard, to: PlaytestZone) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const unique = useMemo(() => {
    const seen = new Map<string, PlaytestCard>();
    for (const c of library) if (!seen.has(c.name)) seen.set(c.name, c);
    const q = query.trim().toLowerCase();
    return [...seen.values()]
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.typeLine.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [library, query]);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          <AppText accessibilityRole="header" style={styles.title}>
            {t('ptSearch')}
          </AppText>
          <AppText muted>{t('ptSearchHint')}</AppText>
          <TextField label={t('ptSearchFilter')} value={query} onChangeText={setQuery} />
          {unique.map((c) => (
            <View
              key={c.uid}
              style={{ gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}
            >
              <AppText style={{ fontWeight: '700' }}>{c.name}</AppText>
              <AppText muted>{c.typeLine}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={t('ptToHand')}
                  variant="secondary"
                  accessibilityLabel={t('ptToHandLabel', { name: c.name })}
                  onPress={() => onPick(c, 'hand')}
                />
                <Button
                  label={t('ptToBattlefield')}
                  variant="secondary"
                  accessibilityLabel={t('ptToBattlefieldLabel', { name: c.name })}
                  onPress={() => onPick(c, 'battlefield')}
                />
              </View>
            </View>
          ))}
          <Button label={t('deckClose')} variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Mesa de testes solo no app (11.4): a mesma lógica do site (core), com cada carta abrindo uma
 * janela com o texto, as palavras-chave e as ações. Nada é gravado; "Desfazer" volta uma ação.
 */
export function PlaytestTable({
  lines,
  startingLife,
}: {
  lines: PlaytestLine[];
  startingLife: number;
}) {
  const start = () => startPlaytest(lines, { startingLife, playFirst: true });
  const [history, setHistory] = useState<PlaytestState[]>(() => [start()]);
  const [playFirst, setPlayFirst] = useState(true);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<{ uid: string; zone: PlaytestZone } | null>(null);
  const [searching, setSearching] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenCount, setTokenCount] = useState('1');
  const [tokenForm, setTokenForm] = useState(false);
  const hints = useDismissedHints();
  const [size, chooseSize] = useCardSize();
  const state = history[history.length - 1]!;
  const mana = manaAvailable(state);
  const choosing = state.turn === 0;

  const dispatch = (action: PlaytestAction, message?: string) => {
    setHistory((h) => [...h.slice(-99), playtest(h[h.length - 1]!, action)]);
    if (message) setStatus(message);
  };
  const move = (card: PlaytestCard, to: Target) =>
    dispatch(
      to === 'libraryTop'
        ? { type: 'move', uid: card.uid, to: 'library', position: 'top' }
        : to === 'libraryBottom'
          ? { type: 'move', uid: card.uid, to: 'library', position: 'bottom' }
          : { type: 'move', uid: card.uid, to },
      t('ptMoved', { name: card.name, zone: t(ZONE_LABEL[to]) }),
    );
  const openCard = open ? (state.zones[open.zone].find((c) => c.uid === open.uid) ?? null) : null;
  const taxed = [...state.zones.command, ...state.zones.battlefield].some(
    (c) => c.isCommander && commanderTax(state, c.uid) > 0,
  );
  const lands = state.zones.battlefield.filter((c) => c.isLand);
  const permanents = state.zones.battlefield.filter((c) => !c.isLand);

  const tile = (c: PlaytestCard, zone: PlaytestZone, note?: string) => (
    <Pressable
      key={c.uid}
      accessibilityRole="button"
      accessibilityLabel={[
        c.name,
        c.tapped ? t('ptIsTapped') : '',
        c.isToken ? t('ptIsToken') : '',
        note ?? '',
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={t('ptCardHint')}
      onPress={() =>
        choosing && zone === 'hand' && state.toBottom > 0
          ? dispatch({ type: 'bottom', uid: c.uid }, t('ptSentToBottom', { name: c.name }))
          : setOpen({ uid: c.uid, zone })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <CardFace card={c} width={CARD_WIDTH[size]} />
      {note ? (
        <AppText muted style={{ fontSize: 12, textAlign: 'center' }}>
          {note}
        </AppText>
      ) : null}
    </Pressable>
  );

  const bar = (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={[styles.sectionTitle, { fontSize: 22 }]}>
        {choosing ? t('ptOpeningHand') : t('ptTurn', { turn: state.turn })}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button
          label="−"
          variant="secondary"
          accessibilityLabel={t('ptLifeMinus')}
          onPress={() => dispatch({ type: 'life', delta: -1 })}
        />
        <AppText
          style={{ fontSize: 22, fontWeight: '700', minWidth: 56, textAlign: 'center' }}
          accessibilityLabel={`${t('ptLife')}: ${state.life}`}
        >
          {state.life}
        </AppText>
        <Button
          label="+"
          variant="secondary"
          accessibilityLabel={t('ptLifePlus')}
          onPress={() => dispatch({ type: 'life', delta: 1 })}
        />
      </View>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
        accessible
        accessibilityLabel={t('ptMana', { count: mana.total })}
      >
        <AppText>{t('ptMana', { count: mana.total })}</AppText>
        {mana.sources.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            {s.split('').map((c, j) => (
              <ManaSymbol key={j} symbol={c} size={18} />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText muted style={{ flex: 1 }}>
          {t('ptLibrary', { count: state.zones.library.length })}
        </AppText>
        <TermHelp id="grimorio" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {!choosing && (
          <Button
            label={t('ptNextTurn')}
            icon="next"
            onPress={() =>
              dispatch({ type: 'nextTurn' }, t('ptNextTurnDone', { turn: state.turn + 1 }))
            }
          />
        )}
        {!choosing && (
          <Button
            label={t('ptDraw')}
            variant="secondary"
            onPress={() => dispatch({ type: 'draw' }, t('ptDrew'))}
          />
        )}
        <Button
          label={t('ptSearch')}
          icon="filter"
          variant="secondary"
          onPress={() => setSearching(true)}
        />
        <Button
          label={t('ptUndo')}
          icon="undo"
          variant="secondary"
          disabled={history.length <= 1}
          onPress={() => {
            setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
            setStatus(t('ptUndone'));
          }}
        />
        <Button
          label={t('ptRestart')}
          icon="refresh"
          variant="secondary"
          onPress={() => {
            setHistory([start()]);
            setStatus(t('ptRestarted'));
          }}
        />
      </View>
      <AppText muted accessibilityLiveRegion="polite">
        {status}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <AppText style={{ fontWeight: '600' }}>{t('ptSize')}</AppText>
        {(['small', 'medium', 'large'] as const).map((value) => (
          <Button
            key={value}
            label={t(SIZE_LABEL[value])}
            variant="secondary"
            selected={size === value}
            accessibilityLabel={`${t('ptSize')}: ${t(SIZE_LABEL[value])}`}
            onPress={() => chooseSize(value)}
          />
        ))}
      </View>
    </Card>
  );

  const hintCards = (
    <>
      {state.turn >= 2 && !hints.dismissed.includes('turn') && (
        <Hint
          text={t('ptHintTurn')}
          links={[
            { label: t('ptLesson', { title: lessonTitle('o-turno') }), path: '/aprender/o-turno' },
          ]}
          onDismiss={() => hints.dismiss('turn')}
        />
      )}
      {mana.total > 0 && !hints.dismissed.includes('mana') && (
        <Hint
          text={t('ptHintMana')}
          links={[
            {
              label: t('ptLesson', { title: lessonTitle('mana-e-terrenos') }),
              path: '/aprender/mana-e-terrenos',
            },
          ]}
          onDismiss={() => hints.dismiss('mana')}
        />
      )}
      {taxed && !hints.dismissed.includes('tax') && (
        <Hint
          text={t('ptHintTax')}
          links={[
            { label: t('ptInGlossary'), path: '/aprender/glossario#imposto-do-comandante' },
            {
              label: t('ptLesson', { title: lessonTitle('commander-o-formato') }),
              path: '/aprender/commander-o-formato',
            },
          ]}
          onDismiss={() => hints.dismiss('tax')}
        />
      )}
    </>
  );

  const mulligan = choosing && (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <AppText accessibilityRole="header" style={[styles.sectionTitle, { flex: 1 }]}>
          {t('ptMulliganTitle', { count: state.mulligans })}
        </AppText>
        <TermHelp id="mulligan" />
      </View>
      <AppText
        style={state.toBottom > 0 ? { fontWeight: '700' } : undefined}
        muted={state.toBottom === 0}
      >
        {state.toBottom > 0 ? t('ptChooseBottom', { count: state.toBottom }) : t('ptMulliganHint')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={t('ptKeep')}
          icon="done"
          disabled={state.toBottom > 0}
          onPress={() => {
            let next = playtest(state, { type: 'keep' });
            if (!playFirst) next = playtest(next, { type: 'draw' });
            setHistory((h) => [...h, next]);
            setStatus(t('ptKept'));
          }}
        />
        <Button
          label={t('ptMulligan')}
          icon="refresh"
          variant="secondary"
          disabled={state.mulligans >= 6}
          onPress={() => dispatch({ type: 'mulligan' }, t('ptMulliganed'))}
        />
        <Button
          label={t('ptPlayFirst')}
          variant="secondary"
          selected={playFirst}
          accessibilityRole="switch"
          accessibilityState={{ checked: playFirst }}
          onPress={() => setPlayFirst((v) => !v)}
        />
      </View>
    </Card>
  );

  const field = (
    <>
      {state.zones.command.length > 0 && (
        <Zone
          title={t('ptZoneCommand')}
          count={state.zones.command.length}
          term="imposto-do-comandante"
        >
          {state.zones.command.map((c) =>
            tile(c, 'command', t('ptTax', { tax: commanderTax(state, c.uid) })),
          )}
        </Zone>
      )}
      <Zone title={t('ptLands')} count={lands.length} term="virar">
        {lands.map((c) => tile(c, 'battlefield'))}
      </Zone>
      <Zone
        title={t('ptPermanents')}
        count={permanents.length}
        term="ficha"
        action={
          tokenForm ? (
            <View style={{ gap: 8 }}>
              <TextField
                label={t('ptTokenName')}
                value={tokenName}
                onChangeText={setTokenName}
                maxLength={80}
              />
              <TextField
                label={t('ptTokenCount')}
                value={tokenCount}
                onChangeText={setTokenCount}
                keyboardType="number-pad"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label={t('ptCreate')}
                  disabled={!tokenName.trim()}
                  onPress={() => {
                    const count = Math.max(1, Math.min(50, Number(tokenCount) || 1));
                    dispatch(
                      { type: 'createToken', name: tokenName.trim(), count },
                      t('ptTokensCreated', { count, name: tokenName.trim() }),
                    );
                    setTokenName('');
                    setTokenCount('1');
                    setTokenForm(false);
                  }}
                />
                <Button
                  label={t('ptCancel')}
                  variant="secondary"
                  onPress={() => setTokenForm(false)}
                />
              </View>
            </View>
          ) : (
            <Button
              label={t('ptCreateToken')}
              icon="add"
              variant="secondary"
              onPress={() => setTokenForm(true)}
              style={{ alignSelf: 'flex-start' }}
            />
          )
        }
      >
        {permanents.map((c) => tile(c, 'battlefield'))}
      </Zone>
    </>
  );

  const others = (
    <>
      <Zone title={t('ptZoneHand')} count={state.zones.hand.length}>
        {state.zones.hand.map((c) => tile(c, 'hand'))}
      </Zone>
      <Zone title={t('ptZoneGraveyard')} count={state.zones.graveyard.length} term="cemiterio">
        {state.zones.graveyard.map((c) => tile(c, 'graveyard'))}
      </Zone>
      <Zone title={t('ptZoneExile')} count={state.zones.exile.length} term="exilio">
        {state.zones.exile.map((c) => tile(c, 'exile'))}
      </Zone>
    </>
  );

  return (
    <View style={{ gap: 16 }}>
      {bar}
      {hintCards}
      {mulligan}
      {/* Tablet: o campo à esquerda; mão, cemitério e exílio à direita. */}
      <SplitColumns gap={16} left={field} right={others} />
      <CardSheet
        card={openCard}
        zone={open?.zone ?? null}
        note={
          openCard?.isCommander ? t('ptTax', { tax: commanderTax(state, openCard.uid) }) : undefined
        }
        onClose={() => setOpen(null)}
        onMove={(to) => openCard && move(openCard, to)}
        onTap={
          open?.zone === 'battlefield' && openCard
            ? () =>
                dispatch(
                  { type: 'toggleTap', uid: openCard.uid },
                  t(openCard.tapped ? 'ptUntapped' : 'ptTapped', { name: openCard.name }),
                )
            : undefined
        }
      />
      <SearchSheet
        open={searching}
        library={state.zones.library}
        onClose={() => setSearching(false)}
        onPick={(card, to) => {
          dispatch(
            { type: 'search', uid: card.uid, to },
            t('ptSearched', { name: card.name, zone: t(ZONE_LABEL[to]) }),
          );
          setSearching(false);
        }}
      />
    </View>
  );
}
