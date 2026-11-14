import type { EventSummary, GameWindow, GroupStats, Ranking } from '@boramarcar/api-client';
import { Link, router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Aura } from '@/components/aura';
import { BetaBanner } from '@/components/beta-banner';
import { NoGroup } from '@/components/no-group';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { useGroup } from '@/lib/group';
import { formatDateTime, formatPercent, t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
      }}
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
    >
      <AppText muted>{label}</AppText>
      <AppText style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      {hint ? <AppText muted>{hint}</AppText> : null}
    </View>
  );
}

function NextEvent({ event }: { event: EventSummary | undefined }) {
  if (!event) {
    return (
      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('dashNextEvent')}
        </AppText>
        <AppText muted>{t('dashNoEvents')}</AppText>
        <Button
          label={t('availTitle')}
          variant="secondary"
          onPress={() => router.push('/disponibilidade')}
        />
      </Card>
    );
  }
  return (
    <Link href={{ pathname: '/encontros/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${t('dashNextEvent')}: ${event.title}, ${formatDateTime(event.startsAt)}, ${event.locationName ?? t('locationTbd')}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Card style={{ gap: 4 }}>
          <AppText muted>{t('dashNextEvent')}</AppText>
          <AppText style={{ fontSize: 20, fontWeight: '700' }}>{event.title}</AppText>
          <AppText>{formatDateTime(event.startsAt)}</AppText>
          <AppText muted>{event.locationName ?? t('locationTbd')}</AppText>
          <AppText style={{ fontWeight: '600', marginTop: 4 }}>{t('dashOpenEvent')}</AppText>
        </Card>
      </Pressable>
    </Link>
  );
}

function MyNumbers({
  ranking,
  stats,
  userId,
}: {
  ranking: Ranking | null;
  stats: GroupStats | null;
  userId: string;
}) {
  const me = ranking?.standings.find((s) => s.userId === userId);
  const mine = stats?.players.find((p) => p.userId === userId);
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('dashYourNumbers')}
      </AppText>
      {!me ? (
        <AppText muted>{t('dashNoGamesYet')}</AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stat
            label={t('dashPosition')}
            value={`${me.position}º`}
            hint={t('dashOfPlayers', { count: ranking?.standings.length ?? 0 })}
          />
          <Stat label={t('points')} value={String(me.points)} />
          <Stat
            label={t('dashWinRate')}
            value={formatPercent(me.winRate)}
            hint={t('dashWinsOf', { wins: me.wins, games: me.games })}
          />
          <Stat
            label={t('dashStreak')}
            value={String(mine?.currentStreak ?? 0)}
            hint={t('dashBestStreak', { count: mine?.bestStreak ?? 0 })}
          />
        </View>
      )}
      {mine && mine.recent.length > 0 && (
        <AppText
          muted
          accessibilityLabel={`${t('dashForm')}: ${mine.recent.map((r) => t(`dashForm_${r}`)).join(', ')}`}
        >
          {t('dashForm')}: {mine.recent.map((r) => t(`dashFormShort_${r}`)).join(' ')}
        </AppText>
      )}
    </Card>
  );
}

function Podium({ ranking }: { ranking: Ranking | null }) {
  const top = ranking?.standings.slice(0, 3) ?? [];
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('dashPodium')}
      </AppText>
      {top.length === 0 ? (
        <AppText muted>{t('rankingEmpty')}</AppText>
      ) : (
        top.map((s) => (
          <Pressable
            key={s.userId}
            accessibilityRole="button"
            accessibilityLabel={t('rankingRow', {
              position: s.position,
              name: s.name,
              points: s.points,
              wins: s.wins,
              games: s.games,
            })}
            onPress={() => router.push({ pathname: '/jogadores/[id]', params: { id: s.userId } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 44,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <AppText style={{ fontSize: 20, fontWeight: '800', minWidth: 32 }}>
              {s.position}º
            </AppText>
            <AppText style={{ flex: 1, fontWeight: '600' }}>{s.name}</AppText>
            <AppText style={{ fontWeight: '700' }}>
              {t('dashPointsShort', { count: s.points })}
            </AppText>
          </Pressable>
        ))
      )}
      <Button
        label={t('dashFullRanking')}
        variant="secondary"
        onPress={() => router.push('/ranking')}
      />
    </Card>
  );
}

function Windows({ windows }: { windows: GameWindow[] | null }) {
  const top = windows?.slice(0, 3) ?? [];
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('dashBestWindows')}
      </AppText>
      {top.length === 0 ? (
        <AppText muted>{t('availNoWindows')}</AppText>
      ) : (
        top.map((w) => (
          <View key={`${w.start.toISOString()}-${w.locationId ?? ''}`}>
            <AppText style={{ fontWeight: '600' }}>{formatDateTime(w.start)}</AppText>
            <AppText muted>
              {w.locationName ?? t('dashAnyLocation')} · {w.players.map((p) => p.name).join(', ')}
            </AppText>
          </View>
        ))
      )}
      <Button
        label={t('availTitle')}
        variant="secondary"
        onPress={() => router.push('/disponibilidade')}
      />
    </Card>
  );
}

function Commanders({ stats }: { stats: GroupStats | null }) {
  const colors = useColors();
  const top = stats?.commanders.slice(0, 4) ?? [];
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('dashHotCommanders')}
      </AppText>
      {top.length === 0 ? (
        <AppText muted>{t('dashNoCommanders')}</AppText>
      ) : (
        top.map((c) => (
          <View
            key={c.name}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessible
            accessibilityLabel={`${c.name}: ${t('dashCommanderStats', { games: c.games, rate: formatPercent(c.winRate) })}, ${c.players.map((p) => p.name).join(', ')}`}
          >
            <View
              style={{
                width: 56,
                height: 40,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: colors.surfaceMuted,
              }}
            >
              {c.artUri && <Image source={{ uri: c.artUri }} style={{ width: 56, height: 40 }} />}
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: '600' }}>{c.name}</AppText>
              <AppText muted>
                {t('dashCommanderStats', { games: c.games, rate: formatPercent(c.winRate) })} ·{' '}
                {c.players.map((p) => p.name).join(', ')}
              </AppText>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

/** Painel (paridade com /painel do site): próximo encontro, seus números, pódio, horários e comandantes. */
export default function DashboardScreen() {
  const { group, loading: loadingGroup, error: groupError, reload } = useGroup();
  const { data: session } = authClient.useSession();
  const events = useAsync(
    () => (group ? api.events.list(group.id, 'upcoming') : Promise.resolve([])),
    [group?.id],
  );
  const ranking = useAsync(
    () => (group ? api.ranking.get(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  const stats = useAsync(
    () => (group ? api.stats.get(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  const windows = useAsync(
    () => (group ? api.availability.windows(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  const refresh = () => {
    void Promise.all([events.refresh(), ranking.refresh(), stats.refresh(), windows.refresh()]);
  };
  useRefreshOnFocus(refresh);

  if (loadingGroup) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (events.loading || ranking.loading) return <Loading />;
  if (events.error) return <ErrorState error={events.error} onRetry={refresh} />;
  const upcoming = events.data ?? [];
  const firstName = session?.user.name?.split(' ')[0] ?? '';

  return (
    <>
      <Aura />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={events.refreshing || ranking.refreshing || stats.refreshing}
            onRefresh={refresh}
          />
        }
      >
        <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
          {t('dashHello', { name: firstName })}
        </AppText>
        <AppText muted>{group.name}</AppText>
        <BetaBanner groupId={group.id} />
        <NextEvent event={upcoming[0]} />
        <MyNumbers ranking={ranking.data} stats={stats.data} userId={session?.user.id ?? ''} />
        <Podium ranking={ranking.data} />
        <Windows windows={windows.data} />
        <Commanders stats={stats.data} />
        {upcoming.length > 1 && (
          <Card style={{ gap: 8 }}>
            <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
              {t('dashMoreEvents')}
            </AppText>
            {upcoming.slice(1, 4).map((e) => (
              <Link key={e.id} href={{ pathname: '/encontros/[id]', params: { id: e.id } }} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${e.title}, ${formatDateTime(e.startsAt)}`}
                  style={({ pressed }) => ({ minHeight: 44, opacity: pressed ? 0.8 : 1 })}
                >
                  <AppText style={{ fontWeight: '600' }}>{e.title}</AppText>
                  <AppText muted>{formatDateTime(e.startsAt)}</AppText>
                </Pressable>
              </Link>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}
