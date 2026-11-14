import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl } from 'react-native';
import { deckFlow } from '@boramarcar/tokens/flow';
import { Aura } from '@/components/aura';
import { StackScrollView } from '@/components/stack';
import { DeckBody } from '@/components/deck/deck-body';
import { ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

/** Deck no app (5.8): seções em pilha de cartas (nota, validação, curva, funções e cartas). */
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useAsync(() => api.decks.get(id), [id]);
  if (deck.loading) return <Loading />;
  if (deck.error || !deck.data) return <ErrorState error={deck.error} onRetry={deck.refresh} />;
  const { analysis } = deck.data;
  // Fluxo de mana nas cores do deck, no peso dos símbolos de mana (base de mana da análise).
  const manaBase = (analysis as { manaBase?: { color: string; pips: number }[] }).manaBase ?? [];
  const flow = deckFlow(
    analysis.colorIdentity,
    Object.fromEntries(manaBase.map((row) => [row.color, row.pips])),
  );
  return (
    <>
      <Aura stops={flow} />
      <StackScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={deck.refreshing} onRefresh={deck.refresh} />}
      >
        <Stack.Screen options={{ title: deck.data.name }} />
        <DeckBody deck={deck.data} onChanged={() => deck.refresh()} />
      </StackScrollView>
    </>
  );
}
