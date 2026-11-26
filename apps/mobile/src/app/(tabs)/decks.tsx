import type { DeckSummary } from '@boramarcar/api-client';
import { formatRules } from '@boramarcar/core/games';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { ManaSymbol } from '@/components/mana';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';
import { EmptyState } from '@/components/empty-state';

/** Rótulo curto do bracket mínimo (2 = "1–2", 4 = "4–5"). */
const BRACKET_SHORT = { 2: '1–2', 3: '3', 4: '4–5' } as const;

/** Meus decks: o detalhe abre no app (5.8); editar continua no site. */
export default function DecksScreen() {
  const decks = useAsync(() => api.decks.list(), []);
  // Deck importado ou apagado aparece ao voltar para a lista.
  useRefreshOnFocus(decks.refresh);
  if (decks.loading) return <Loading />;
  if (decks.error) return <ErrorState error={decks.error} onRetry={decks.refresh} />;
  return (
    <FlatList
      data={decks.data ?? []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={decks.refreshing} onRefresh={decks.refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
            {t('decksTitle')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label={t('deckImportTitle')} onPress={() => router.push('/decks/importar')} />
            <Button
              label={t('collectionOpenScreen')}
              variant="secondary"
              onPress={() => router.push('/colecao')}
            />
          </View>
        </View>
      }
      ListEmptyComponent={<EmptyState>{t('decksEmpty')}</EmptyState>}
      renderItem={({ item }) => <DeckCard deck={item} />}
    />
  );
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;
const COLOR_NAME: Record<string, MessageKey> = {
  W: 'recordsColorW',
  U: 'recordsColorU',
  B: 'recordsColorB',
  R: 'recordsColorR',
  G: 'recordsColorG',
  C: 'recordsColorC',
};

/** Capa do deck como no site (14.2): arte do comandante, tipo de jogo, cores, nota e bracket. */
function DeckCard({ deck }: { deck: DeckSummary }) {
  const colors = useColors();
  const cover = deck.cover ?? null;
  const identity = COLOR_ORDER.filter((c) => cover?.colorIdentity.includes(c));
  const shown: string[] = identity.length ? identity : ['C'];
  const usesCommander = formatRules(deck.format).usesCommander;
  const commanders = usesCommander
    ? cover?.names.length
      ? cover.names.join(' & ')
      : t('deckNoCommander')
    : null;
  const meta = [
    t('cards', { count: deck.cardCount ?? 0 }),
    deck.score != null ? t('deckListScore', { score: deck.score }) : null,
    deck.bracket ? t('deckListBracket', { value: BRACKET_SHORT[deck.bracket] }) : null,
    deck.status === 'draft' ? t('deckDraft') : null,
  ].filter(Boolean);
  const label = [
    t('deckOpen', { name: deck.name }),
    formatLabel(deck.format),
    t('deckColors', { colors: shown.map((c) => t(COLOR_NAME[c]!)).join(', ') }),
    commanders,
    ...meta,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/decks/[id]', params: { id: deck.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ aspectRatio: 16 / 10, backgroundColor: colors.surfaceMuted }}>
          {cover?.artUri ? (
            <Image
              source={{ uri: cover.artUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: colors.badgeBg,
            }}
          >
            <AppText style={{ color: colors.badgeText, fontSize: 12, fontWeight: '600' }}>
              {formatLabel(deck.format)}
            </AppText>
          </View>
        </View>
        <View style={{ padding: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <AppText style={{ flex: 1, fontWeight: '700', fontSize: 16 }}>{deck.name}</AppText>
            <View style={{ flexDirection: 'row', gap: 2, paddingTop: 2 }}>
              {shown.map((c) => (
                <ManaSymbol key={c} symbol={c} size={18} />
              ))}
            </View>
          </View>
          {commanders ? <AppText muted>{commanders}</AppText> : null}
          <AppText muted style={{ fontSize: 13 }}>
            {meta.join(' · ')}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
