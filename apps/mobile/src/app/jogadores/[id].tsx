import type { Achievement, PlayerProfile } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppText, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateMedium, formatMonthYear, formatPercent, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

const ROLE_LABEL: Record<PlayerProfile['groups'][number]['role'], MessageKey> = {
  owner: 'roleOwner',
  admin: 'roleAdmin',
  member: 'roleMember',
};

/** Rótulo curto do bracket mínimo (2 = "1–2", 4 = "4–5"), como na lista de decks. */
const BRACKET_SHORT = { 2: '1–2', 3: '3', 4: '4–5' } as const;

/** Foto ou iniciais; decorativo (o nome está no título ao lado). */
function Avatar({ name, image }: { name: string; image?: string | null }) {
  const colors = useColors();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: 72, height: 72 }} />
      ) : (
        <AppText style={{ fontSize: 24, fontWeight: '800' }}>{initials}</AppText>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
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
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText muted>{label}</AppText>
      <AppText style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
    </View>
  );
}

function achievementStatus(a: Achievement) {
  if (!a.unlocked) {
    const progress = t('achievementProgress', { current: a.progress, target: a.target });
    return `${t('achievementLocked')} · ${progress}`;
  }
  const when = a.unlockedAt
    ? t('achievementUnlockedOn', { date: formatDateMedium(a.unlockedAt) })
    : '';
  const times =
    a.count && a.count > 1
      ? t('achievementTimes', { count: a.count })
      : a.count === 1
        ? t('achievementOnce')
        : '';
  return [when, times].filter(Boolean).join(' · ');
}

function Achievements({ achievements }: { achievements: readonly Achievement[] }) {
  const colors = useColors();
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('achievementsTitle')}
      </AppText>
      <AppText muted>
        {t('achievementsUnlocked', { count: unlocked, total: achievements.length })}
      </AppText>
      {achievements.map((a) => {
        const name = t(`achievement_${a.id}_name` as MessageKey);
        const description = t(`achievement_${a.id}_description` as MessageKey);
        const status = achievementStatus(a);
        return (
          <View
            key={a.id}
            accessible
            accessibilityLabel={`${name}. ${description} ${status}`}
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              opacity: a.unlocked ? 1 : 0.6,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: a.unlocked ? colors.accent : colors.surfaceMuted,
              }}
            >
              <AppText
                style={{ fontWeight: '800', color: a.unlocked ? colors.onAccent : colors.muted }}
              >
                {a.unlocked ? '★' : '☆'}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: '600' }}>{name}</AppText>
              <AppText muted>{description}</AppText>
              <AppText muted>{status}</AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** Perfil de um jogador (o próprio ou alguém de um grupo em comum): resumo, títulos, conquistas e decks. */
export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAsync(() => api.players.get(id), [id]);
  const colors = useColors();

  if (profile.loading) return <Loading />;
  if (profile.error || !profile.data) {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      return (
        <AppText style={[styles.center, { textAlign: 'center' }]} accessibilityRole="alert">
          {t('profileNotFound')}
        </AppText>
      );
    }
    return <ErrorState error={profile.error} onRetry={profile.refresh} />;
  }
  const p = profile.data;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={profile.refreshing} onRefresh={profile.refresh} />
      }
    >
      <Stack.Screen options={{ title: p.isSelf ? t('profileMine') : p.name }} />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Avatar name={p.name} image={p.image} />
        <View style={{ flex: 1 }}>
          <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
            {p.name}
          </AppText>
          {p.email && <AppText muted>{p.email}</AppText>}
          <AppText muted>
            {t('profileMemberSince', { date: formatMonthYear(p.memberSince) })}
          </AppText>
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('profileSummary')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stat label={t('profileGames')} value={String(p.games)} />
          <Stat label={t('profileWins')} value={String(p.wins)} />
          <Stat label={t('profileWinRate')} value={formatPercent(p.winRate)} />
          <Stat label={t('profileDecks')} value={String(p.decks.length)} />
        </View>
        {p.seasonTitles.length > 0 && (
          <View style={{ gap: 4 }}>
            <AppText accessibilityRole="header" style={{ fontWeight: '600' }}>
              {t('profileSeasonTitles')}
            </AppText>
            {p.seasonTitles.map((s) => (
              <AppText key={`${s.groupName}-${s.seasonName}`} style={{ color: colors.accent }}>
                🏆 {t('profileSeasonTitle', { season: s.seasonName, group: s.groupName })}
              </AppText>
            ))}
          </View>
        )}
        {p.groups.length > 0 && (
          <View style={{ gap: 4 }}>
            <AppText accessibilityRole="header" style={{ fontWeight: '600' }}>
              {t(p.isSelf ? 'profileGroups' : 'profileSharedGroups')}
            </AppText>
            {p.groups.map((g) => (
              <AppText key={g.id}>
                {g.name} · <AppText muted>{t(ROLE_LABEL[g.role])}</AppText>
              </AppText>
            ))}
          </View>
        )}
      </Card>

      <Achievements achievements={p.achievements} />

      <View style={{ gap: 8 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {t('profileDecks')}
        </AppText>
        {p.decks.length === 0 ? (
          <AppText muted>{t('profileNoDecks')}</AppText>
        ) : (
          p.decks.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={t('deckOpen', { name: d.name })}
              onPress={() => router.push({ pathname: '/decks/[id]', params: { id: d.id } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Card>
                <AppText style={{ fontWeight: '700' }}>{d.name}</AppText>
                <AppText muted>
                  {[
                    t('cards', { count: d.cardCount ?? 0 }),
                    d.score != null ? t('deckListScore', { score: d.score }) : null,
                    d.bracket ? t('deckListBracket', { value: BRACKET_SHORT[d.bracket] }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
