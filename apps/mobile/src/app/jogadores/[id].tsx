import type { Achievement, PlayerProfile } from '@boramarcar/api-client';
import { NewAchievements } from '@/components/new-achievements';
import { ApiError } from '@boramarcar/api-client';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppText, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateMedium, formatMonthYear, formatPercent, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useState } from 'react';
import { splitAchievements } from '@boramarcar/core/achievements';
import { Choices } from '@/components/ds/choices';
import { useAsync } from '@/lib/use-async';
import { useGroup } from '@/lib/group';
import { authClient } from '@/lib/auth';
import { headToHeadBetween } from '@boramarcar/core/integration';
import { Stat } from '@/components/ds/stat';
import { Avatar } from '@/components/avatar';

const ROLE_LABEL: Record<PlayerProfile['groups'][number]['role'], MessageKey> = {
  owner: 'roleOwner',
  admin: 'roleAdmin',
  member: 'roleMember',
};

/** Rótulo curto do bracket mínimo (2 = "1–2", 4 = "4–5"), como na lista de decks. */
const BRACKET_SHORT = { 2: '1–2', 3: '3', 4: '4–5' } as const;

/** Foto ou iniciais; decorativo (o nome está no título ao lado). */

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
  // "Para conquistar" abre por padrão (as mais perto de sair primeiro); "Conquistadas" ao lado.
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const { pending, done } = splitAchievements(achievements);
  const shown = tab === 'pending' ? pending : done;
  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('achievementsTitle')}
      </AppText>
      <AppText muted>
        {t('achievementsUnlocked', { count: done.length, total: achievements.length })}
      </AppText>
      <Choices
        label={t('achievementsTitle')}
        hideLabel
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: t('achievementsTabPending', { count: pending.length }) },
          { value: 'done', label: t('achievementsTabDone', { count: done.length }) },
        ]}
      />
      {shown.length === 0 ? (
        <AppText muted>
          {tab === 'pending' ? t('achievementsAllDone') : t('achievementsNoneYet')}
        </AppText>
      ) : null}
      {shown.map((a) => {
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
  // Placar entre você e a pessoa (8.11), das estatísticas do grupo ativo.
  const { group } = useGroup();
  const { data: session } = authClient.useSession();
  const me = session?.user.id;
  const stats = useAsync(
    () => (group && me && me !== id ? api.stats.get(group.id) : Promise.resolve(null)),
    [group?.id, me, id],
  );

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
      {/* No próprio perfil: conquistas ganhas desde a última visita (abre sozinha). */}
      {p.isSelf && <NewAchievements />}
      {(() => {
        const versus =
          !p.isSelf && me && stats.data
            ? headToHeadBetween(stats.data.headToHead ?? [], me, id)
            : null;
        return versus ? (
          <Card>
            <AppText>
              {t('profileVersus', {
                wins: versus.wins,
                losses: versus.losses,
                games: versus.games,
                name: p.name,
              })}
            </AppText>
          </Card>
        ) : null;
      })()}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Avatar size={72} name={p.name} image={p.image} />
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
