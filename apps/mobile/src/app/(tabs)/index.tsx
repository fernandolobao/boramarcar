import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Aura } from '@/components/aura';
import { BetaBanner } from '@/components/beta-banner';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { formatDateTime, t } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';
import { useColors } from '@/lib/theme';
import { NoGroup } from '@/components/no-group';
import { EmptyState } from '@/components/empty-state';
import { gridColumns, useLayout } from '@/lib/layout';

/** Próximos encontros do grupo ativo. */
export default function EventsScreen() {
  // Tablet: encontros em 2 ou 3 colunas.
  const layout = useLayout();
  const columns = gridColumns(layout.innerWidth, { min: 320, max: 3, gap: 12 });
  const itemWidth = (layout.innerWidth - 12 * (columns - 1)) / columns;
  const { group, loading: loadingGroup, error: groupError, reload } = useGroup();
  const colors = useColors();
  const events = useAsync(
    () => (group ? api.events.list(group.id, 'upcoming') : Promise.resolve([])),
    [group?.id],
  );
  // Encontro criado (aqui ou pela disponibilidade) aparece ao voltar para a lista.
  useRefreshOnFocus(events.refresh);
  if (loadingGroup) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (events.loading) return <Loading />;
  if (events.error) return <ErrorState error={events.error} onRetry={events.refresh} />;

  return (
    <>
      <Aura />
      <FlatList
        // Trocar o número de colunas exige uma lista nova (o React Native não muda ao vivo).
        key={`cols-${columns}`}
        data={events.data ?? []}
        keyExtractor={(e) => e.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={[layout.contentStyle, { gap: 12 }]}
        refreshControl={
          <RefreshControl refreshing={events.refreshing} onRefresh={events.refresh} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
              {group.name} · {t('upcoming')}
            </AppText>
            <BetaBanner groupId={group.id} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button label={t('eventNew')} onPress={() => router.push('/encontros/novo')} />
              <Button
                label={t('historyOpen')}
                variant="secondary"
                onPress={() => router.push('/encontros/historico')}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState>{t('noEvents')}</EmptyState>}
        renderItem={({ item }) => (
          <View style={{ width: itemWidth }}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${item.title}, ${formatDateTime(item.startsAt)}, ${
                item.locationName ?? t('locationTbd')
              }${item.status === 'cancelled' ? `, ${t('statusCancelled')}` : ''}`}
              onPress={() => router.push({ pathname: '/encontros/[id]', params: { id: item.id } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Card>
                <AppText style={{ fontWeight: '700' }}>
                  {item.title}
                  {item.status === 'cancelled' && (
                    <AppText style={{ color: colors.danger }}> · {t('statusCancelled')}</AppText>
                  )}
                </AppText>
                <AppText muted>{formatDateTime(item.startsAt)}</AppText>
                <AppText muted>{item.locationName ?? t('locationTbd')}</AppText>
              </Card>
            </Pressable>
          </View>
        )}
      />
    </>
  );
}
