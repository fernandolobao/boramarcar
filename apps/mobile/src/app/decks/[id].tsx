import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { DeckBody } from '@/components/deck/deck-body';
import { ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

/** Deck no app (5.8): cartas por tipo, edição, curva, funções, nota e validação; editar no site. */
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useAsync(() => api.decks.get(id), [id]);
  if (deck.loading) return <Loading />;
  if (deck.error || !deck.data) return <ErrorState error={deck.error} onRetry={deck.refresh} />;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={deck.refreshing} onRefresh={deck.refresh} />}
    >
      <Stack.Screen options={{ title: deck.data.name }} />
      <DeckBody deck={deck.data} />
    </ScrollView>
  );
}
