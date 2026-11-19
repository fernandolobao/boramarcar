import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import { NoGroup } from '@/components/no-group';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { useGroup } from '@/lib/group';
import { t, type MessageKey } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';

const STATUS: Record<string, MessageKey> = {
  registration: 'tourStatusRegistration',
  running: 'tourStatusRunning',
  finished: 'tourStatusFinished',
};

/** Torneios do grupo (9.1): lista; dono e admins criam novos. */
export default function TournamentsScreen() {
  const { group, loading } = useGroup();
  const list = useAsync(
    () => (group ? api.tournaments.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  useRefreshOnFocus(list.refresh);
  if (loading || list.loading) return <Loading />;
  if (!group) return <NoGroup />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.refresh} />;
  const canCreate = group.role !== 'member';
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
    >
      <AppText accessibilityRole="header" style={styles.title}>
        {t('tourTitle')}
      </AppText>
      <AppText muted>{t('tourIntro')}</AppText>
      {canCreate && (
        <Button
          label={t('tourNew')}
          onPress={() => router.push('/torneios/novo')}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
      {(list.data ?? []).length === 0 ? (
        <AppText muted>{t('tourEmpty')}</AppText>
      ) : (
        (list.data ?? []).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${formatLabel(item.format)}, ${t('tourEntrants', { count: item.entrants })}, ${t(STATUS[item.status] ?? 'tourStatusRunning')}`}
            onPress={() => router.push({ pathname: '/torneios/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Card style={{ gap: 2 }}>
              <AppText style={{ fontWeight: '700', fontSize: 17 }}>{item.name}</AppText>
              <AppText muted>
                {formatLabel(item.format)} · {t('tourEntrants', { count: item.entrants })}
              </AppText>
              <AppText>{t(STATUS[item.status] ?? 'tourStatusRunning')}</AppText>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
