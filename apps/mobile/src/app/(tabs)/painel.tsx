import type { GameWindow, GroupStats, PartnerHint } from '@boramarcar/api-client';
import { isNewMember, rivalriesFor } from '@boramarcar/core/integration';
import { router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Aura } from '@/components/aura';
import { BetaBanner } from '@/components/beta-banner';
import { NewAchievements } from '@/components/new-achievements';
import { NoGroup } from '@/components/no-group';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { useGroup } from '@/lib/group';
import { formatDate, formatDateTime, formatPercent, t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';
import { DashboardHero, NumberTiles, Podium, RecentForm } from '@/components/dashboard';
import { SplitColumns } from '@/components/split-columns';
import { useLayout } from '@/lib/layout';

function Windows({ windows }: { windows: GameWindow[] | null }) {
  const top = windows?.slice(0, 3) ?? [];
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
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
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
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

/** "Com quem você ainda não jogou" (como no site): até 3 pessoas, primeiro quem vai no próximo. */
function Partners({ hints }: { hints: PartnerHint[] | null }) {
  if (!hints || hints.length === 0) return null;
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('partnersTitle')}
      </AppText>
      <AppText muted>{t('partnersHint')}</AppText>
      {hints.map((h) => {
        const text = h.lastPlayedAt
          ? t('partnersSince', { name: h.name, date: formatDate(h.lastPlayedAt) })
          : t('partnersNever', { name: h.name });
        return (
          <Pressable
            key={h.userId}
            accessibilityRole="link"
            accessibilityLabel={h.confirmedNext ? `${text} ${t('partnersGoingNext')}` : text}
            onPress={() => router.push({ pathname: '/jogadores/[id]', params: { id: h.userId } })}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              minHeight: 44,
              justifyContent: 'center',
            })}
          >
            <AppText>{text}</AppText>
            {h.confirmedNext && <AppText muted>{t('partnersGoingNext')}</AppText>}
          </Pressable>
        );
      })}
    </Card>
  );
}

/** Rivalidades (8.11): maior rival e freguês, com no mínimo 3 partidas juntos. */
function Rivalries({ stats, userId }: { stats: GroupStats | null; userId: string }) {
  if (!stats?.headToHead) return null;
  const { rival, prey } = rivalriesFor(stats.headToHead, userId);
  if (!rival && !prey) return null;
  const nameOf = (id: string) => stats.players.find((p) => p.userId === id)?.name ?? '';
  const items = [
    rival
      ? {
          id: rival.opponentId,
          text: t('rivalryRival', {
            name: nameOf(rival.opponentId),
            losses: rival.losses,
            games: rival.games,
          }),
        }
      : null,
    prey
      ? {
          id: prey.opponentId,
          text: t('rivalryPrey', {
            name: nameOf(prey.opponentId),
            wins: prey.wins,
            games: prey.games,
          }),
        }
      : null,
  ].filter((x): x is { id: string; text: string } => x !== null);
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('rivalriesTitle')}
      </AppText>
      <AppText muted>{t('rivalriesHint')}</AppText>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="link"
          accessibilityLabel={item.text}
          onPress={() => router.push({ pathname: '/jogadores/[id]', params: { id: item.id } })}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            minHeight: 44,
            justifyContent: 'center',
          })}
        >
          <AppText>{item.text}</AppText>
        </Pressable>
      ))}
    </Card>
  );
}

/** Painel (paridade com /painel do site): próximo encontro, seus números, pódio, horários e comandantes. */
export default function DashboardScreen() {
  const layout = useLayout();
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
  // Detalhe do próximo encontro (quem confirmou e a sua resposta), para o destaque.
  const nextId = events.data?.[0]?.id ?? null;
  const nextDetail = useAsync(
    () => (nextId ? api.events.get(nextId) : Promise.resolve(null)),
    [nextId],
  );
  const partners = useAsync(
    () => (group ? api.groups.partners(group.id) : Promise.resolve(null)),
    [group?.id],
  );
  const refresh = () => {
    void Promise.all([
      events.refresh(),
      nextDetail.refresh(),
      ranking.refresh(),
      stats.refresh(),
      windows.refresh(),
      partners.refresh(),
    ]);
  };
  useRefreshOnFocus(refresh);

  if (loadingGroup) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (events.loading || ranking.loading) return <Loading />;
  if (events.error) return <ErrorState error={events.error} onRetry={refresh} />;
  const upcoming = events.data ?? [];
  const firstName = session?.user.name?.split(' ')[0] ?? '';
  const userId = session?.user.id ?? '';
  const me = ranking.data?.standings.find((st) => st.userId === userId) ?? null;
  const mine = stats.data?.players.find((p) => p.userId === userId) ?? null;

  return (
    <>
      <Aura />
      {/* Conquistas ganhas desde a última visita (abre sozinha). */}
      <NewAchievements />
      <ScrollView
        contentContainerStyle={[layout.contentStyle, { gap: 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={events.refreshing || ranking.refreshing || stats.refreshing}
            onRefresh={refresh}
          />
        }
      >
        <DashboardHero
          groupName={group.name}
          firstName={firstName}
          welcome={isNewMember(group.joinedAt, new Date()) ? t('dashWelcomeNew') : undefined}
          art={stats.data?.commanders.find((c) => c.artUri)?.artUri ?? null}
          event={upcoming[0]}
          detail={nextDetail.data ?? null}
          userId={userId}
        />
        <BetaBanner groupId={group.id} />
        <AppText accessibilityRole="header" style={[styles.sectionTitle, { fontSize: 21 }]}>
          {t('dashYourNumbers')}
        </AppText>
        <NumberTiles
          me={me}
          playerCount={ranking.data?.standings.length ?? 0}
          streak={mine?.currentStreak ?? 0}
          bestStreak={mine?.bestStreak ?? 0}
        />
        <RecentForm recent={mine?.recent ?? []} />
        {/* Tablet: duas colunas; celular: a mesma ordem, uma embaixo da outra. */}
        <SplitColumns
          left={
            <>
              <Podium ranking={ranking.data} />
              <Rivalries stats={stats.data} userId={userId} />
              <Partners hints={partners.data} />
            </>
          }
          right={
            <>
              <Windows windows={windows.data} />
              <Commanders stats={stats.data} />
              {upcoming.length > 1 && (
                <Card style={{ gap: 8 }}>
                  <AppText accessibilityRole="header" style={styles.sectionTitle}>
                    {t('dashMoreEvents')}
                  </AppText>
                  {upcoming.slice(1, 4).map((e) => (
                    <Pressable
                      key={e.id}
                      accessibilityRole="link"
                      accessibilityLabel={`${e.title}, ${formatDateTime(e.startsAt)}`}
                      onPress={() =>
                        router.push({ pathname: '/encontros/[id]', params: { id: e.id } })
                      }
                      style={({ pressed }) => ({ minHeight: 44, opacity: pressed ? 0.8 : 1 })}
                    >
                      <AppText style={{ fontWeight: '600' }}>{e.title}</AppText>
                      <AppText muted>{formatDateTime(e.startsAt)}</AppText>
                    </Pressable>
                  ))}
                </Card>
              )}
            </>
          }
        />
      </ScrollView>
    </>
  );
}
