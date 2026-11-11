import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { AppText, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

/** Rótulo curto do bracket mínimo (2 = "1–2", 4 = "4–5"). */
const BRACKET_SHORT = { 2: '1–2', 3: '3', 4: '4–5' } as const;

/** Meus decks: o detalhe abre no app (5.8); editar continua no site. */
export default function DecksScreen() {
  const decks = useAsync(() => api.decks.list(), []);
  if (decks.loading) return <Loading />;
  if (decks.error) return <ErrorState error={decks.error} onRetry={decks.refresh} />;
  return (
    <FlatList
      data={decks.data ?? []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={decks.refreshing} onRefresh={decks.refresh} />}
      ListHeaderComponent={
        <AppText accessibilityRole="header" style={styles.title}>
          {t('decksTitle')}
        </AppText>
      }
      ListEmptyComponent={<AppText muted>{t('decksEmpty')}</AppText>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('deckOpen', { name: item.name })}
          onPress={() => router.push({ pathname: '/decks/[id]', params: { id: item.id } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card>
            <AppText style={{ fontWeight: '700' }}>{item.name}</AppText>
            <AppText muted>
              {[
                t('cards', { count: item.cardCount ?? 0 }),
                item.score != null ? t('deckListScore', { score: item.score }) : null,
                item.bracket ? t('deckListBracket', { value: BRACKET_SHORT[item.bracket] }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </Card>
        </Pressable>
      )}
    />
  );
}
