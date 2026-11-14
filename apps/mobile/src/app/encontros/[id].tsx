import type { Rsvp } from '@boramarcar/api-client';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { EventRecap, FinishEvent } from '@/components/event-finish';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';
import { useColors } from '@/lib/theme';

const RSVP_LABEL: Record<Rsvp, MessageKey> = { yes: 'rsvpYes', maybe: 'rsvpMaybe', no: 'rsvpNo' };

/** Detalhe do encontro: participantes, partidas e a resposta de presença. */
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const colors = useColors();
  const event = useAsync(() => api.events.get(id), [id]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  // Partida registrada (formulário ou modo mesa) aparece ao voltar para cá.
  useRefreshOnFocus(event.refresh);

  if (event.loading) return <Loading />;
  if (event.error || !event.data) {
    return <ErrorState error={event.error} onRetry={event.refresh} />;
  }
  const e = event.data;
  const mine = e.participants.find((p) => p.userId === session?.user.id)?.rsvp;

  const answer = async (rsvp: Rsvp) => {
    setSaving(true);
    setMessage('');
    try {
      await api.events.rsvp(e.id, rsvp);
      setMessage(t('rsvpSaved'));
      await event.refresh();
    } catch {
      setMessage(t('loadError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={event.refreshing} onRefresh={event.refresh} />}
    >
      <Stack.Screen options={{ title: e.title }} />
      <View>
        <AppText accessibilityRole="header" style={styles.title}>
          {e.title}
        </AppText>
        <AppText muted>{formatDateTime(e.startsAt)}</AppText>
        <AppText muted>{e.location?.name ?? t('locationTbd')}</AppText>
        {e.status !== 'scheduled' && (
          <AppText
            style={{
              fontWeight: '700',
              color: e.status === 'cancelled' ? colors.danger : colors.success,
            }}
          >
            {t(e.status === 'cancelled' ? 'statusCancelled' : 'statusFinished')}
          </AppText>
        )}
      </View>

      {e.status === 'scheduled' && (
        <Card>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('rsvpTitle')}
          </AppText>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
          >
            {(['yes', 'maybe', 'no'] as const).map((value) => (
              <Button
                key={value}
                label={t(RSVP_LABEL[value])}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: mine === value, disabled: saving }}
                selected={mine === value}
                disabled={saving}
                onPress={() => void answer(value)}
              />
            ))}
          </View>
          <AppText muted accessibilityLiveRegion="polite">
            {message}
          </AppText>
        </Card>
      )}

      {e.status !== 'cancelled' && (
        <Card style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('gameRecord')}
          </AppText>
          <AppText muted>{t('tableOpenHint')}</AppText>
          <Button
            label={t('tableOpen')}
            onPress={() => router.push({ pathname: '/mesa/[id]', params: { id: e.id } })}
          />
          <AppText muted>{t('gameRecordHint')}</AppText>
          <Button
            label={t('gameRecord')}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/partida/[eventId]', params: { eventId: e.id } })
            }
          />
        </Card>
      )}

      {/* Organizador: finalizar depois do início (manda o resumo da noite). */}
      {e.canManage && e.status === 'scheduled' && e.startsAt.getTime() <= Date.now() && (
        <FinishEvent event={e} onDone={() => void event.refresh()} />
      )}
      {e.status === 'finished' && e.games.length > 0 && <EventRecap event={e} />}

      <Card>
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('participants')}
        </AppText>
        {e.participants.map((p) => (
          <AppText key={p.userId}>
            {p.name} · {t(RSVP_LABEL[p.rsvp])}
          </AppText>
        ))}
      </Card>

      {e.games.length > 0 && (
        <Card>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('games')}
          </AppText>
          {e.games.map((g) => (
            <View key={g.id} style={{ gap: 2 }}>
              <AppText style={{ fontWeight: '600' }}>{t('game', { number: g.number })}</AppText>
              <AppText muted>
                {g.isDraw
                  ? t('draw')
                  : t('winner', { names: g.winners.map((w) => w.name).join(', ') })}
              </AppText>
              {g.canEdit && (
                <Button
                  label={t('gameEdit')}
                  variant="secondary"
                  accessibilityLabel={`${t('gameEdit')}: ${t('game', { number: g.number })}`}
                  onPress={() =>
                    router.push({
                      pathname: '/partida/[eventId]',
                      params: { eventId: e.id, gameId: g.id },
                    })
                  }
                  style={{ alignSelf: 'flex-start' }}
                />
              )}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
