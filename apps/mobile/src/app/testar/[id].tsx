import type { PlaytestLine } from '@boramarcar/core/decks';
import { isGameFormat } from '@boramarcar/core/games';
import { startingLifeFor } from '@boramarcar/core/table';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { PlaytestTable } from '@/components/playtest';
import { AppText, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLayout } from '@/lib/layout';
import { useAsync } from '@/lib/use-async';

/** Mesa de testes solo (11.4): o deck numa mesa de mentira, no aparelho. Nada é gravado. */
export default function PlaytestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useLayout();
  const deck = useAsync(() => api.decks.get(id), [id]);
  if (deck.loading) return <Loading />;
  if (deck.error || !deck.data) return <ErrorState error={deck.error} onRetry={deck.refresh} />;
  const lines: PlaytestLine[] = deck.data.lines
    .filter((l) => l.board === 'mainboard' || l.board === 'commander')
    .map((l) => ({
      name: l.name,
      board: l.board,
      quantity: l.quantity,
      // A face da frente diz se é terreno.
      isLand: (l.card?.typeLine ?? '').split('//')[0]!.includes('Land'),
      imageUri: l.card?.imageUri ?? null,
      typeLine: l.card?.typeLine ?? '',
      manaCost: l.card?.manaCost ?? null,
      oracleText: l.card?.oracleText ?? '',
      colorIdentity: l.card?.colorIdentity ?? [],
    }));
  const format = isGameFormat(deck.data.format) ? deck.data.format : 'commander';
  return (
    <ScrollView contentContainerStyle={[layout.contentStyle, { gap: 12 }]}>
      <Stack.Screen options={{ title: t('ptTitle') }} />
      <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
        {deck.data.name}
      </AppText>
      <AppText muted>{t('ptIntro')}</AppText>
      <PlaytestTable lines={lines} startingLife={startingLifeFor(format)} />
    </ScrollView>
  );
}
