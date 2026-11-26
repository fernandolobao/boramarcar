import type { CollectionEntry } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CARD_RATIO, CardTile } from '@/components/card-tile';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField } from '@/components/fields';
import { Tip } from '@/components/tip';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';
import { NumberField } from '@/components/ds/number-field';
import { Choices } from '@/components/ds/choices';
import { Checkbox } from '@/components/ds/checkbox';
import { gridColumns, useLayout } from '@/lib/layout';

type Sort = 'name' | 'value' | 'recent';
type FoilFilter = 'all' | 'foil' | 'nonfoil';

const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const price = (e: CollectionEntry) => (e.card?.priceUsd ? Number(e.card.priceUsd) : null);

/** Adicionar cartas: nome com sugestões do Scryfall, cópias e foil. */
function AddCard({ onAdded }: { onAdded: (message: string) => void }) {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; printedName: string | null }[]>(
    [],
  );
  const [quantity, setQuantity] = useState(1);
  const [foil, setFoil] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) return setSuggestions([]);
    const timer = setTimeout(() => {
      api.cards
        .autocomplete(query)
        .then((found) => setSuggestions(found.filter((s) => s.name !== query).slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [name]);
  const add = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.collection.add({ name: name.trim(), quantity, foil });
      setName('');
      setSuggestions([]);
      setQuantity(1);
      setFoil(false);
      onAdded(t('collectionAdded', { name: r.name }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('collectionAddTitle')}
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="list">
          {suggestions.map((s) => {
            const label = s.printedName ? `${s.printedName} (${s.name})` : s.name;
            return (
              <Button
                key={s.name}
                label={label}
                variant="secondary"
                accessibilityLabel={t('collectionUseSuggestion', { name: label })}
                onPress={() => {
                  setName(s.name);
                  setSuggestions([]);
                }}
              />
            );
          })}
        </View>
      )}
      <NumberField
        label={t('collectionQuantity')}
        value={quantity}
        min={1}
        max={999}
        onChange={(q) => setQuantity(q ?? 1)}
      />
      <Checkbox
        label={t('collectionFoil')}
        checked={foil}
        onChange={() => setFoil((f) => !f)}
        style={{ alignSelf: 'flex-start' }}
      />
      <Button
        label={busy ? t('collectionAdding') : t('collectionAdd')}
        disabled={busy || name.trim().length === 0}
        onPress={() => void add()}
      />
      {error && (
        <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
          {error}
        </AppText>
      )}
    </Card>
  );
}

/** Uma linha da coleção aberta: imagem, edição, cópias, foil, decks e remover. */
function EntrySheet({
  entry,
  onClose,
  onChanged,
}: {
  entry: CollectionEntry | null;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>, done: string) => {
    if (!entry) return;
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged(done);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  const card = entry?.card;
  return (
    <Modal visible={entry !== null} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {entry && (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <AppText accessibilityRole="header" style={styles.title}>
              {entry.name}
              {entry.foil ? ` · ${t('collectionFoil')}` : ''}
            </AppText>
            {card?.imageUri ? (
              <Image
                source={{ uri: card.imageUri }}
                accessibilityLabel={entry.name}
                resizeMode="contain"
                style={{ width: '100%', aspectRatio: CARD_RATIO, borderRadius: 16 }}
              />
            ) : (
              <AppText muted>{t('deckNoImage')}</AppText>
            )}
            {card?.setName && (
              <AppText muted>
                {t('deckSet', {
                  set: card.setName,
                  code: (card.setCode ?? '').toUpperCase(),
                  number: card.collectorNumber ?? '',
                })}
                {card.artist ? ` · ${card.artist}` : ''}
              </AppText>
            )}
            <AppText muted>
              {price(entry) !== null
                ? t('collectionUnitPrice', { price: usd(price(entry)!) })
                : t('collectionNoPrice')}
            </AppText>
            <NumberField
              label={t('collectionQuantity')}
              value={entry.quantity}
              // 0 tira a carta da coleção.
              min={0}
              max={999}
              disabled={busy}
              onChange={(q) => {
                if (q === null || q === entry.quantity) return;
                void run(
                  () => api.collection.update(entry.id, { quantity: q }),
                  q === 0
                    ? t('collectionRemoved', { name: entry.name })
                    : t('collectionSaved', { name: entry.name }),
                );
              }}
            />
            <Checkbox
              label={t('collectionFoil')}
              checked={entry.foil}
              disabled={busy}
              onChange={() =>
                void run(
                  () => api.collection.update(entry.id, { foil: !entry.foil }),
                  t('collectionSaved', { name: entry.name }),
                )
              }
              style={{ alignSelf: 'flex-start' }}
            />
            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '600' }}>{t('collectionDecksTitle')}</AppText>
              {entry.decks.length === 0 ? (
                <AppText muted>{t('collectionNotInDecks')}</AppText>
              ) : (
                entry.decks.map((d) => (
                  <AppText key={d.deckId} muted>
                    {t('collectionDeckUse', { deck: d.deckName, quantity: d.quantity })}
                    {d.proxies > 0 ? ` (${t('deckProxiesCount', { count: d.proxies })})` : ''}
                  </AppText>
                ))
              )}
            </View>
            <View style={{ alignSelf: 'flex-start' }}>
              <ConfirmButton
                label={t('collectionRemove')}
                confirmLabel={t('collectionConfirmRemove')}
                context={entry.name}
                disabled={busy}
                onConfirm={() =>
                  run(
                    () => api.collection.remove(entry.id),
                    t('collectionRemoved', { name: entry.name }),
                  )
                }
              />
            </View>
            {error && (
              <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
                {error}
              </AppText>
            )}
            <Button label={t('deckClose')} onPress={onClose} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/** Coleção (paridade com /colecao): o que a pessoa tem de verdade, com busca, filtros e totais. */
export default function CollectionScreen() {
  const collection = useAsync(() => api.collection.list(), []);
  // Tablet: mais cartas por linha (3 no celular, até 8 no iPad deitado).
  const layout = useLayout();
  const columns = gridColumns(layout.innerWidth, { min: 110, max: 8 });
  // Largura fixa: na última linha incompleta, as cartas não esticam.
  const itemWidth = (layout.innerWidth - 8 * (columns - 1)) / columns;
  const [search, setSearch] = useState('');
  const [foilFilter, setFoilFilter] = useState<FoilFilter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(60);

  const all = collection.data ?? [];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = all.filter(
      (e) =>
        (foilFilter === 'all' || (foilFilter === 'foil') === e.foil) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          (e.card?.typeLine ?? '').toLowerCase().includes(q)),
    );
    const by: Record<Sort, (a: CollectionEntry, b: CollectionEntry) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      value: (a, b) => (price(b) ?? -1) * b.quantity - (price(a) ?? -1) * a.quantity,
      recent: (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
    };
    return rows.sort(by[sort]);
  }, [all, search, foilFilter, sort]);
  const copies = visible.reduce((n, e) => n + e.quantity, 0);
  const value = visible.reduce((n, e) => n + (price(e) ?? 0) * e.quantity, 0);
  const open = all.find((e) => e.id === openId) ?? null;

  if (collection.loading) return <Loading />;
  if (collection.error) return <ErrorState error={collection.error} onRetry={collection.refresh} />;

  return (
    <>
      <Stack.Screen options={{ title: t('collectionTitle') }} />
      <FlatList
        // Trocar o número de colunas exige uma lista nova (o React Native não muda ao vivo).
        key={`cols-${columns}`}
        data={visible.slice(0, limit)}
        keyExtractor={(e) => e.id}
        numColumns={columns}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={[layout.contentStyle, { gap: 8 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={collection.refreshing} onRefresh={collection.refresh} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
              {t('collectionTitle')}
            </AppText>
            <AppText muted>{t('collectionIntro')}</AppText>
            <Tip id="collection" />
            <AddCard
              onAdded={(m) => {
                setMessage(m);
                void collection.refresh();
              }}
            />
            <Card style={{ gap: 12 }}>
              <TextField
                label={t('collectionSearch')}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <Choices
                label={t('collectionFoilFilter')}
                value={foilFilter}
                options={[
                  { value: 'all', label: t('collectionFoilAll') },
                  { value: 'foil', label: t('collectionFoilOnly') },
                  { value: 'nonfoil', label: t('collectionNonFoil') },
                ]}
                onChange={setFoilFilter}
              />
              <Choices
                label={t('collectionSort')}
                value={sort}
                options={[
                  { value: 'name', label: t('collectionSortName') },
                  { value: 'value', label: t('collectionSortValue') },
                  { value: 'recent', label: t('collectionSortRecent') },
                ]}
                onChange={setSort}
              />
            </Card>
            <AppText accessibilityRole="header" accessibilityLiveRegion="polite" muted>
              {all.length === 0
                ? t('collectionEmpty')
                : t('collectionResults', {
                    lines: visible.length,
                    total: all.length,
                    copies,
                    value: usd(value),
                  })}
            </AppText>
            <AppText muted accessibilityLiveRegion="polite">
              {message}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: itemWidth }}>
            <CardTile
              name={item.name}
              imageUri={item.card?.imageUri}
              quantity={item.quantity}
              foil={item.foil}
              showName
              accessibilityLabel={t('collectionOpen', {
                name: item.name,
                count: item.quantity,
                extra: [
                  item.foil ? t('collectionFoil') : null,
                  item.card?.setCode?.toUpperCase() ?? null,
                ]
                  .filter(Boolean)
                  .join(', '),
              })}
              onPress={() => setOpenId(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          visible.length > limit ? (
            <Button
              label={t('collectionShowMore', { count: Math.min(60, visible.length - limit) })}
              variant="secondary"
              onPress={() => setLimit((l) => l + 60)}
            />
          ) : undefined
        }
      />
      <EntrySheet
        entry={open}
        onClose={() => setOpenId(null)}
        onChanged={async (m) => {
          setMessage(m);
          await collection.refresh();
          if (m === t('collectionRemoved', { name: open?.name ?? '' })) setOpenId(null);
        }}
      />
    </>
  );
}
