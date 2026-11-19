import { ApiError } from '@boramarcar/api-client';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, t } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';

/** Evento de loja (10.2c): vagas, premiação, regras, inscrever-se/desistir e o torneio ao vivo. */
export default function StoreEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const view = useAsync(() => api.storeEvents.get(id), [id]);
  useRefreshOnFocus(view.refresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (view.loading) return <Loading />;
  if (view.error || !view.data) return <ErrorState error={view.error} onRetry={view.refresh} />;
  const { event, tournamentId } = view.data;
  const cancelled = event.status === 'cancelled';
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await view.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  const spots = event.capacity
    ? t('storeEvSpots', { registered: event.registered, capacity: event.capacity })
    : t('storeEvSpotsOpen', { registered: event.registered });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />}
    >
      <Stack.Screen options={{ title: event.title }} />
      <View style={{ gap: 4 }}>
        <AppText muted>
          {t(event.kind === 'tournament' ? 'storeEvKindTournament' : 'storeEvKindCasual')} ·{' '}
          {formatLabel(event.format)}
        </AppText>
        <AppText accessibilityRole="header" style={styles.title}>
          {event.title}
        </AppText>
        <Button
          label={event.store.name}
          variant="secondary"
          accessibilityLabel={t('storeEvOpenStore', { store: event.store.name })}
          onPress={() =>
            router.push({ pathname: '/lojas/[slug]', params: { slug: event.store.slug } })
          }
          style={{ alignSelf: 'flex-start' }}
        />
        <AppText>{formatDateTime(event.startsAt)}</AppText>
        {cancelled && (
          <AppText accessibilityRole="alert" style={{ fontWeight: '700' }}>
            {t('storeEvCancelled')}
          </AppText>
        )}
      </View>

      <Card style={{ gap: 10 }}>
        <AppText style={{ fontWeight: '700', fontSize: 17 }}>
          {spots}
          {event.waitlist > 0 ? ` · ${t('storeEvWaitlistCount', { count: event.waitlist })}` : ''}
        </AppText>
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        {tournamentId ? (
          <>
            <AppText muted>{t('storeEvRegistrationClosed')}</AppText>
            <Button
              label={t('storeEvFollow')}
              onPress={() =>
                router.push({ pathname: '/torneios/[id]', params: { id: tournamentId } })
              }
            />
          </>
        ) : event.myEntry ? (
          <>
            <AppText accessibilityLiveRegion="polite" style={{ fontWeight: '600' }}>
              {t(event.myEntry.status === 'registered' ? 'storeEvRegistered' : 'storeEvWaitlisted')}
            </AppText>
            {!cancelled && (
              <ConfirmButton
                label={t('storeEvLeave')}
                confirmLabel={t('storeEvLeaveConfirm')}
                context={event.title}
                disabled={busy}
                onConfirm={() => act(() => api.storeEvents.leave(event.myEntry!.id))}
              />
            )}
          </>
        ) : (
          !cancelled && (
            <Button
              label={t('storeEvRegister')}
              disabled={busy}
              onPress={() => void act(() => api.storeEvents.register(event.id))}
            />
          )
        )}
      </Card>

      {event.prizes ? (
        <Card style={{ gap: 6 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('storeEvPrizes')}
          </AppText>
          <AppText>{event.prizes}</AppText>
        </Card>
      ) : null}
      {event.rules ? (
        <Card style={{ gap: 6 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('storeEvRules')}
          </AppText>
          <AppText>{event.rules}</AppText>
        </Card>
      ) : null}
    </ScrollView>
  );
}
