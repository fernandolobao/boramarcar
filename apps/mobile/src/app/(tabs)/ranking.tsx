import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { resolvePeriod } from '@boramarcar/core/stats';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { deviceTimeZone } from '@/lib/dates';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { NoGroup } from '@/components/no-group';

/** Ranking do grupo ativo (todas as partidas). */
export default function RankingScreen() {
  const { group } = useGroup();
  const [period, setPeriod] = useState('all');
  const [format, setFormat] = useState<GameFormat | undefined>();
  const seasons = useAsync(
    () => (group ? api.seasons.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const range = resolvePeriod(period, {
    now: new Date(),
    timeZone: deviceTimeZone(),
    seasons: seasons.data ?? [],
  });
  const ranking = useAsync(
    () =>
      group
        ? api.ranking.get(group.id, { from: range.from, to: range.to, format })
        : Promise.resolve(null),
    [group?.id, period, format, seasons.data],
  );
  const periods = [
    { value: 'all', label: t('rankingPeriodAll') },
    { value: 'last30', label: t('rankingPeriodLast30') },
    { value: 'thisYear', label: t('rankingPeriodThisYear') },
    ...(seasons.data ?? []).map((s) => ({
      value: `season:${s.id}`,
      label: t('rankingSeason', { name: s.name }),
    })),
  ];
  if (!group) return <NoGroup />;
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
        <View style={{ gap: 12, marginBottom: 8 }}>
          <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
            {t('rankingTitle')}
          </AppText>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontWeight: '600' }}>{t('rankingPeriod')}</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('rankingPeriod')}
            >
              {periods.map((p) => (
                <Button
                  key={p.value}
                  label={p.label}
                  variant="secondary"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: period === p.value }}
                  selected={period === p.value}
                  onPress={() => setPeriod(p.value)}
                />
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontWeight: '600' }}>{t('rankingFormat')}</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('rankingFormat')}
            >
              {[undefined, ...GAME_FORMATS].map((f) => (
                <Button
                  key={f ?? 'all'}
                  label={f ? formatLabel(f) : t('rankingFormatAll')}
                  variant="secondary"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: format === f }}
                  selected={format === f}
                  onPress={() => setFormat(f)}
                />
              ))}
            </ScrollView>
          </View>
          <AppText muted accessibilityLiveRegion="polite">
            {ranking.loading
              ? t('loading')
              : t('rankingGamesCount', { count: ranking.data?.totalGames ?? 0 })}
          </AppText>
        </View>
      }
      ListEmptyComponent={
        ranking.loading ? <Loading /> : <AppText muted>{t('rankingEmpty')}</AppText>
      }
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
