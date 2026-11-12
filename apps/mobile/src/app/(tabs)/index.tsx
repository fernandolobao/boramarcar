import { Link, router } from 'expo-router';
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

/** Próximos encontros do grupo ativo. */
export default function EventsScreen() {
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
        data={events.data ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={events.refreshing} onRefresh={events.refresh} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
              {group.name} · {t('upcoming')}
            </AppText>
            <BetaBanner groupId={group.id} />
            <Button label={t('eventNew')} onPress={() => router.push('/encontros/novo')} />
          </View>
        }
        ListEmptyComponent={<AppText muted>{t('noEvents')}</AppText>}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/encontros/[id]', params: { id: item.id } }} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${item.title}, ${formatDateTime(item.startsAt)}, ${
                item.locationName ?? t('locationTbd')
              }${item.status === 'cancelled' ? `, ${t('statusCancelled')}` : ''}`}
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
          </Link>
        )}
      />
    </>
  );
}
