import type { CardPrint, DeckLine } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { DECK_BOARDS, type DeckBoard } from '@boramarcar/core/decks';
import { useEffect, useState } from 'react';
import { FlatList, Image, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField } from '@/components/fields';
import { AppText, Button, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const CARD_RATIO = 63 / 88;
const BOARD_LABEL: Record<DeckBoard, MessageKey> = {
  commander: 'deckBoardCommander',
  mainboard: 'deckBoardMainboard',
  sideboard: 'deckBoardSideboard',
  maybeboard: 'deckBoardMaybeboard',
};

/** Mesmo filtro do site: código + número, parte do nome da edição ou ilustrador. */
export function matchesPrint(p: CardPrint, filter: string) {
  const tokens = filter.toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean);
  const setName = p.setName.toLowerCase();
  const artist = (p.artist ?? '').toLowerCase();
  const code = p.setCode.toLowerCase();
  const number = p.collectorNumber.toLowerCase();
  const words = tokens.filter((x) => x !== code && x !== number).join(' ');
  return words.length === 0 || setName.includes(words) || (artist !== '' && artist.includes(words));
}

/** Escolher a edição (impressão) de uma carta: lista do Scryfall com filtro. */
function PrintPicker({
  line,
  onClose,
  onPick,
}: {
  line: DeckLine | null;
  onClose: () => void;
  onPick: (print: CardPrint) => Promise<void>;
}) {
  const colors = useColors();
  const [prints, setPrints] = useState<CardPrint[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!line) return;
    setPrints(null);
    setFilter('');
    setError('');
    api.cards
      .prints(line.name)
      .then(setPrints)
      .catch(() => setError(t('deckPrintsUnavailable')));
  }, [line]);
  const visible = (prints ?? []).filter((p) => matchesPrint(p, filter));
  return (
    <Modal visible={line !== null} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={visible.slice(0, 60)}
          keyExtractor={(p) => p.scryfallId}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 8 }}>
              <AppText accessibilityRole="header" style={styles.title}>
                {t('deckPrintTitle', { name: line?.name ?? '' })}
              </AppText>
              <TextField
                label={t('deckPrintFilter')}
                value={filter}
                onChangeText={setFilter}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <AppText muted accessibilityLiveRegion="polite">
                {prints === null && !error
                  ? t('deckPrintsLoading')
                  : error || t('deckPrintsCount', { count: visible.length })}
              </AppText>
              <Button label={t('deckClose')} variant="secondary" onPress={onClose} />
            </View>
          }
          ListEmptyComponent={prints === null && !error ? <Loading /> : undefined}
          renderItem={({ item }) => {
            const inUse = item.scryfallId === line?.scryfallId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.setName}, ${item.setCode.toUpperCase()} #${item.collectorNumber}${item.artist ? `, ${item.artist}` : ''}${inUse ? `, ${t('deckPrintInUse')}` : ''}`}
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await onPick(item);
                  } finally {
                    setBusy(false);
                  }
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  gap: 4,
                  padding: 6,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: inUse ? colors.brand : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    aspectRatio: CARD_RATIO,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  {item.imageUri && (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </View>
                <AppText style={{ fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
                  {item.setName}
                </AppText>
                <AppText muted style={{ fontSize: 12 }}>
                  {item.setCode.toUpperCase()} #{item.collectorNumber}
                  {item.priceUsd ? ` · US$ ${item.priceUsd}` : ''}
                </AppText>
                {item.artist ? (
                  <AppText muted style={{ fontSize: 12 }}>
                    {item.artist}
                  </AppText>
                ) : null}
                {inUse && (
                  <AppText style={{ fontSize: 12, fontWeight: '700' }}>
                    {t('deckPrintInUse')}
                  </AppText>
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <AppText muted style={{ fontSize: 12 }}>
        {label}
      </AppText>
      <Button
        label="−"
        variant="secondary"
        accessibilityLabel={t('stepDown', { label, value })}
        disabled={disabled || value <= min}
        onPress={() => onChange(value - 1)}
        style={{ width: 40, minHeight: 36, paddingHorizontal: 0, paddingVertical: 6 }}
      />
      <AppText
        style={{ minWidth: 24, textAlign: 'center', fontWeight: '700' }}
        accessibilityLiveRegion="polite"
      >
        {value}
      </AppText>
      <Button
        label="+"
        variant="secondary"
        accessibilityLabel={t('stepUp', { label, value })}
        disabled={disabled || value >= max}
        onPress={() => onChange(value + 1)}
        style={{ width: 40, minHeight: 36, paddingHorizontal: 0, paddingVertical: 6 }}
      />
    </View>
  );
}

/** Uma linha em modo de edição: cópias, proxies, edição e remover. */
export function LineEditor({
  deckId,
  line,
  onChanged,
  onPickPrint,
}: {
  deckId: string;
  line: DeckLine;
  onChanged: (message?: string) => Promise<void>;
  onPickPrint: (line: DeckLine) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (quantity: number, proxies: number) => {
    setBusy(true);
    setError('');
    try {
      await api.decks.setLine(deckId, {
        name: line.name,
        board: line.board,
        quantity,
        proxies: Math.min(proxies, quantity),
        scryfallId: line.scryfallId,
      });
      await onChanged(quantity === 0 ? t('deckLineRemoved', { name: line.name }) : undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 6, paddingVertical: 8 }}>
      <AppText style={{ fontWeight: '600' }}>
        {t('deckLine', { quantity: line.quantity, name: line.name })}
        {line.card?.setCode ? ` · ${line.card.setCode.toUpperCase()}` : ''}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Counter
          label={t('deckCopies')}
          value={line.quantity}
          min={1}
          max={250}
          disabled={busy}
          onChange={(q) => void save(q, line.proxies)}
        />
        <Counter
          label={t('deckProxyTag')}
          value={line.proxies}
          min={0}
          max={line.quantity}
          disabled={busy}
          onChange={(p) => void save(line.quantity, p)}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={t('deckPrintChoose')}
          variant="secondary"
          accessibilityLabel={`${t('deckPrintChoose')}: ${line.name}`}
          disabled={busy}
          onPress={() => onPickPrint(line)}
        />
        <ConfirmButton
          label={t('deckLineRemove')}
          confirmLabel={t('groupConfirmRemove')}
          context={line.name}
          disabled={busy}
          onConfirm={() => save(0, 0)}
        />
      </View>
      {error && (
        <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
          {error}
        </AppText>
      )}
    </View>
  );
}

/** Adicionar carta pelo nome (com sugestões do Scryfall), board e cópias. */
export function AddCardForm({
  deckId,
  onChanged,
}: {
  deckId: string;
  onChanged: (message?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [board, setBoard] = useState<DeckBoard>('mainboard');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) return setSuggestions([]);
    const timer = setTimeout(() => {
      api.cards
        .autocomplete(query)
        .then((names) => setSuggestions(names.filter((n) => n !== query).slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [name]);
  const add = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.decks.addCard(deckId, { name: name.trim(), board, quantity, proxies: 0 });
      if (!r.found) {
        setError(t('deckCardNotFound', { name: name.trim() }));
        return;
      }
      const added = name.trim();
      setName('');
      setSuggestions([]);
      setQuantity(1);
      await onChanged(t('deckCardAdded', { name: added }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10, paddingTop: 8 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('deckAddCard')}
      </AppText>
      <TextField
        label={t('collectionAddCard')}
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        autoCapitalize="words"
        maxLength={200}
      />
      {suggestions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((n) => (
            <Button
              key={n}
              label={n}
              variant="secondary"
              accessibilityLabel={t('collectionUseSuggestion', { name: n })}
              onPress={() => {
                setName(n);
                setSuggestions([]);
              }}
            />
          ))}
        </View>
      )}
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('deckBoard')}
      >
        {DECK_BOARDS.map((b) => (
          <Button
            key={b}
            label={t(BOARD_LABEL[b])}
            variant="secondary"
            accessibilityRole="radio"
            accessibilityState={{ checked: board === b }}
            selected={board === b}
            onPress={() => setBoard(b)}
          />
        ))}
      </View>
      <Counter label={t('deckCopies')} value={quantity} min={1} max={250} onChange={setQuantity} />
      <Button
        label={busy ? t('collectionAdding') : t('deckAddCard')}
        disabled={busy || name.trim().length === 0}
        onPress={() => void add()}
      />
      {error && (
        <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
          {error}
        </AppText>
      )}
    </View>
  );
}

/** Estado e modal de troca de edição, compartilhados pelas linhas em edição. */
export function usePrintPicker(deckId: string, onChanged: (message?: string) => Promise<void>) {
  const [line, setLine] = useState<DeckLine | null>(null);
  const picker = (
    <PrintPicker
      line={line}
      onClose={() => setLine(null)}
      onPick={async (print) => {
        if (!line) return;
        try {
          await api.decks.changePrint(deckId, {
            name: line.name,
            board: line.board,
            fromScryfallId: line.scryfallId,
            toScryfallId: print.scryfallId,
            quantity: line.quantity,
          });
          setLine(null);
          await onChanged(
            t('deckPrintChanged', {
              name: line.name,
              print: `${print.setCode.toUpperCase()} #${print.collectorNumber}`,
            }),
          );
        } catch {
          await onChanged(t('loadError'));
        }
      }}
    />
  );
  return { picker, open: setLine };
}
