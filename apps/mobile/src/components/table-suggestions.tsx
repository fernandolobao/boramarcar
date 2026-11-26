import { formatRules, isGameFormat, MIN_PLAYERS_FOR_TABLES, suggestTables } from '@boramarcar/core';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { useColors } from '@/lib/theme';

const newPairsLabel = (count: number) =>
  count === 0
    ? t('tablesNewPairsNone')
    : count === 1
      ? t('tablesNewPairsOne')
      : t('tablesNewPairs', { count });

/**
 * Sugestão de mesas do encontro (como no site): junta quem menos jogou junto. Só com o encontro
 * marcado, 6+ confirmados e formato todos contra todos; "Sortear de novo" troca a semente.
 */
export function TableSuggestions({ eventId, confirmed }: { eventId: string; confirmed: number }) {
  const colors = useColors();
  const [seed, setSeed] = useState(1);
  const enough = confirmed >= MIN_PLAYERS_FOR_TABLES;
  const pairings = useAsync(
    () => (enough ? api.events.pairings(eventId) : Promise.resolve(null)),
    [eventId, enough, confirmed],
  );
  const data = pairings.data;
  const result = useMemo(() => {
    if (!data || !isGameFormat(data.format)) return null;
    const rules = formatRules(data.format);
    if (rules.structure !== 'free_for_all') return null;
    const min = Math.max(3, rules.minPlayers);
    const max = Math.min(5, rules.maxPlayers);
    if (min > max) return null;
    return suggestTables(
      data.players.map((p) => p.userId),
      data.pairs,
      { seed, min, max, preferred: Math.min(max, Math.max(min, 4)) },
    );
  }, [data, seed]);
  if (!result || !data) return null;
  const names = new Map(data.players.map((p) => [p.userId, p.name]));

  return (
    <Card style={{ gap: 12 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('tablesTitle')}
      </AppText>
      <AppText muted>{t('tablesHint')}</AppText>
      {result.tables.map((table, i) => (
        <View
          key={i}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            gap: 4,
          }}
        >
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {t('tablesTable', { number: i + 1 })}
          </AppText>
          <AppText>
            {table.playerIds
              .map((id) => names.get(id) ?? '')
              .sort((a, b) => a.localeCompare(b))
              .join(', ')}
          </AppText>
          <AppText muted>{newPairsLabel(table.newPairs)}</AppText>
        </View>
      ))}
      <Button label={t('tablesReroll')} variant="secondary" onPress={() => setSeed((s) => s + 1)} />
      <AppText muted accessibilityLiveRegion="polite">
        {seed > 1 ? t('tablesRerolled') : ''}
      </AppText>
    </Card>
  );
}
