import { RefreshControl, ScrollView, View } from 'react-native';
import { NoGroup } from '@/components/no-group';
import { AppText, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { formatDateMedium, formatPercent, t, type MessageKey } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

const COLOR_KEYS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;

/** Recordes e "cara do grupo" (8.12), com os mesmos dados do site. */
export default function RecordsScreen() {
  const { group, loading } = useGroup();
  const view = useAsync(
    () => (group ? api.stats.records(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  if (loading || view.loading) return <Loading />;
  if (!group) return <NoGroup />;
  if (view.error || !view.data) return <ErrorState error={view.error} onRetry={view.refresh} />;
  const { records, face, people, eventTitles, totalGames } = view.data;
  const name = (id: string) => people[id] ?? t('recordsSomeone');
  const event = (id: string) => eventTitles[id] ?? t('recordsEvent');
  const lines: { key: string; title: string; text: string }[] = [];
  if (records.fastestWin) {
    const r = records.fastestWin;
    lines.push({
      key: 'fastest',
      title: t('recordsFastestTitle'),
      text: t(r.winnerIds.length > 1 ? 'recordsFastestMany' : 'recordsFastest', {
        who: r.winnerIds.map(name).join(t('recordsAnd')),
        turn: r.turn,
        event: event(r.eventId),
        date: formatDateMedium(r.playedAt),
      }),
    });
  }
  if (records.longestGame) {
    const r = records.longestGame;
    lines.push({
      key: 'longest',
      title: t('recordsLongestTitle'),
      text: t('recordsLongest', {
        minutes: r.minutes,
        event: event(r.eventId),
        date: formatDateMedium(r.playedAt),
      }),
    });
  }
  if (records.longestStreak) {
    const r = records.longestStreak;
    lines.push({
      key: 'streak',
      title: t('recordsStreakTitle'),
      text: t('recordsStreak', {
        who: name(r.userId),
        length: r.length,
        event: event(r.eventId),
        date: formatDateMedium(r.playedAt),
      }),
    });
  }
  if (records.busiestNight) {
    const r = records.busiestNight;
    lines.push({
      key: 'night',
      title: t('recordsNightTitle'),
      text: t('recordsNight', {
        games: r.games,
        event: event(r.eventId),
        date: formatDateMedium(r.playedAt),
      }),
    });
  }
  if (records.topCommander) {
    lines.push({
      key: 'commander',
      title: t('recordsCommanderTitle'),
      text: t('recordsCommander', {
        name: records.topCommander.name,
        wins: records.topCommander.wins,
      }),
    });
  }
  const colorTotal = COLOR_KEYS.reduce((sum, c) => sum + (face.colors[c] ?? 0), 0);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />}
    >
      <AppText accessibilityRole="header" style={styles.title}>
        {t('recordsTitle')}
      </AppText>
      {totalGames === 0 ? (
        <AppText muted>{t('recordsEmpty')}</AppText>
      ) : (
        <>
          <Card style={{ gap: 12 }}>
            {lines.map((line) => (
              <View key={line.key} accessible style={{ gap: 2 }}>
                <AppText style={{ fontWeight: '700' }}>{line.title}</AppText>
                <AppText>{line.text}</AppText>
              </View>
            ))}
          </Card>
          <Card style={{ gap: 8 }}>
            <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
              {t('recordsFaceTitle')}
            </AppText>
            {colorTotal > 0 ? (
              <AppText>
                {COLOR_KEYS.filter((c) => (face.colors[c] ?? 0) > 0)
                  .map(
                    (c) =>
                      `${t(`recordsColor${c}` as MessageKey)} ${formatPercent((face.colors[c] ?? 0) / colorTotal)}`,
                  )
                  .join(' · ')}
              </AppText>
            ) : null}
            <AppText>{t('recordsCommanders', { count: face.commanders })}</AppText>
            {face.meta.length > 0 ? (
              <View style={{ gap: 2 }}>
                <AppText style={{ fontWeight: '600' }}>{t('recordsMetaTitle')}</AppText>
                {face.meta.map((m, i) => (
                  <AppText key={m.name}>
                    {i + 1}. {m.name} · {t('recordsMetaGames', { count: m.games })}
                  </AppText>
                ))}
              </View>
            ) : null}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
