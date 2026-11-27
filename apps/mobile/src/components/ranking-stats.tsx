import type { GroupStats } from '@boramarcar/api-client';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, Card, styles } from '@/components/ui';
import { locale, t } from '@/lib/i18n';

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/** Um número com rótulo (destaques). */
function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <View accessible style={{ flexGrow: 1, flexBasis: 140, gap: 2 }}>
      <AppText muted>{label}</AppText>
      <AppText style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
    </View>
  );
}

/** Título de seção das estatísticas. */
const Heading = ({ children }: { children: string }) => (
  <AppText accessibilityRole="header" style={styles.sectionTitle}>
    {children}
  </AppText>
);

/**
 * Estatísticas do ranking, como no site, abaixo da classificação e com os mesmos filtros:
 * destaques, sequências, confronto direto, decks e comandantes mais jogados.
 */
export function RankingStats({ stats }: { stats: GroupStats }) {
  if (stats.totalGames === 0) return null;
  const nameOf = (id: string) => stats.players.find((p) => p.userId === id)?.name ?? '';
  // Confronto direto: um par por linha (só uma das duas direções), com partidas entre os dois.
  const pairs = (stats.headToHead ?? []).filter((h) => h.userId < h.opponentId && h.games > 0);
  const streaks = [...stats.players].sort(
    (a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak,
  );
  const decks = (stats.decks ?? []).slice(0, 5);
  const commanders = stats.commanders.slice(0, 5);
  const noData = t('statsNoData');

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <Card style={{ gap: 10 }}>
        <Heading>{t('statsHighlights')}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Highlight
            label={t('statsAverageTurn')}
            value={
              stats.averageWinningTurn == null
                ? noData
                : stats.averageWinningTurn.toLocaleString(locale, { maximumFractionDigits: 1 })
            }
          />
          <Highlight
            label={t('statsAverageDuration')}
            value={
              stats.averageDurationMinutes == null
                ? noData
                : t('statsMinutes', { value: Math.round(stats.averageDurationMinutes) })
            }
          />
          <Highlight
            label={t('statsFirstWinRate')}
            value={
              stats.firstPlayerWinRate == null
                ? noData
                : t('statsFirstWinRateValue', {
                    rate: percent(stats.firstPlayerWinRate),
                    count: stats.firstPlayerSample ?? 0,
                  })
            }
          />
        </View>
      </Card>

      <Card style={{ gap: 6 }}>
        <Heading>{t('statsStreaks')}</Heading>
        {streaks.map((p) => (
          <View
            key={p.userId}
            accessible
            accessibilityLabel={t('statsStreakRow', {
              name: p.name,
              current: p.currentStreak,
              best: p.bestStreak,
            })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}
          >
            <AppText style={{ flex: 1 }} numberOfLines={1}>
              {p.name}
            </AppText>
            <AppText muted style={{ fontVariant: ['tabular-nums'] }}>
              {t('statsStreakValue', { current: p.currentStreak, best: p.bestStreak })}
            </AppText>
          </View>
        ))}
      </Card>

      {pairs.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Heading>{t('statsHeadToHead')}</Heading>
          <AppText muted>{t('statsHeadToHeadHint')}</AppText>
          {pairs.map((h) => (
            <AppText key={`${h.userId}-${h.opponentId}`} style={{ fontVariant: ['tabular-nums'] }}>
              {t('statsHeadToHeadRow', {
                a: nameOf(h.userId),
                b: nameOf(h.opponentId),
                aWins: h.wins,
                bWins: h.losses,
              })}
            </AppText>
          ))}
        </Card>
      )}

      {decks.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Heading>{t('statsDecks')}</Heading>
          {decks.map((d) => (
            <Pressable
              key={d.deckId}
              accessibilityRole="button"
              accessibilityLabel={`${d.name}. ${t('statsDeckLine', {
                owner: d.ownerName,
                games: d.games,
                wins: d.wins,
                rate: percent(d.winRate),
              })}`}
              onPress={() => router.push({ pathname: '/decks/[id]', params: { id: d.deckId } })}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText style={{ fontWeight: '600' }}>{d.name}</AppText>
              <AppText muted>
                {t('statsDeckLine', {
                  owner: d.ownerName,
                  games: d.games,
                  wins: d.wins,
                  rate: percent(d.winRate),
                })}
              </AppText>
            </Pressable>
          ))}
        </Card>
      )}

      {commanders.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Heading>{t('statsCommanders')}</Heading>
          {commanders.map((c) => (
            <View key={c.name} accessible style={{ gap: 2, paddingVertical: 4 }}>
              <AppText style={{ fontWeight: '600' }}>{c.name}</AppText>
              <AppText muted>
                {t('statsCommanderLine', {
                  players: c.players.map((p) => p.name).join(', '),
                  games: c.games,
                  rate: percent(c.winRate),
                })}
              </AppText>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
