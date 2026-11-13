import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { AppText, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { NoGroup } from '@/components/no-group';

/** Ranking do grupo ativo (todas as partidas). */
export default function RankingScreen() {
  const { group } = useGroup();
  const ranking = useAsync(
    () => (group ? api.ranking.get(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  if (!group) return <NoGroup />;
  if (ranking.loading) return <Loading />;
  if (ranking.error) return <ErrorState error={ranking.error} onRetry={ranking.refresh} />;
  return (
    <FlatList
      data={ranking.data?.standings ?? []}
      keyExtractor={(s) => s.userId}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={
        <RefreshControl refreshing={ranking.refreshing} onRefresh={ranking.refresh} />
      }
      ListHeaderComponent={
        <AppText accessibilityRole="header" style={styles.title}>
          {t('rankingTitle')}
        </AppText>
      }
      ListEmptyComponent={<AppText muted>{t('rankingEmpty')}</AppText>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rankingRow', {
            position: item.position,
            name: item.name,
            points: item.points,
            wins: item.wins,
            games: item.games,
          })}
          accessibilityHint={t('profileOpen', { name: item.name })}
          onPress={() => router.push({ pathname: '/jogadores/[id]', params: { id: item.userId } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AppText style={{ fontSize: 20, fontWeight: '800', minWidth: 32 }}>
              {item.position}º
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: '600' }}>{item.name}</AppText>
              <AppText muted>
                {item.wins} {t('wins')} · {item.games} {t('gamesShort')}
              </AppText>
            </View>
            <AppText style={{ fontWeight: '700' }}>
              {item.points} {t('points')}
            </AppText>
          </Card>
        </Pressable>
      )}
    />
  );
}
