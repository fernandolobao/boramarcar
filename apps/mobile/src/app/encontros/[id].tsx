import type { Rsvp } from '@boramarcar/api-client';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { EventRecap, FinishEvent } from '@/components/event-finish';
import { EventManage, ShareEvent } from '@/components/event-manage';
import { TableSuggestions } from '@/components/table-suggestions';
import { PushOffer } from '@/components/push-offer';
import { shouldOfferPush } from '@boramarcar/core/push';
import { getPushState, markPushOffered, wasPushOffered } from '@/lib/push';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';
import { useColors } from '@/lib/theme';
import { Choices } from '@/components/ds/choices';
import { SplitColumns } from '@/components/split-columns';
import { Avatar } from '@/components/avatar';
import { useLayout } from '@/lib/layout';

const RSVP_LABEL: Record<Rsvp, MessageKey> = { yes: 'rsvpYes', maybe: 'rsvpMaybe', no: 'rsvpNo' };
/** Quem vai primeiro, depois talvez, depois quem não vai. */
const RSVP_ORDER: Record<Rsvp, number> = { yes: 0, maybe: 1, no: 2 };

/** Detalhe do encontro: participantes, partidas e a resposta de presença. */
export default function EventScreen() {
  const layout = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const colors = useColors();
  const event = useAsync(() => api.events.get(id), [id]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [offerPush, setOfferPush] = useState(false);
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
      // Hora útil para oferecer os avisos (7.5): uma vez por aparelho, com os avisos desligados.
      const [state, offered] = await Promise.all([
        getPushState().catch(() => 'unavailable' as const),
        wasPushOffered().catch(() => true),
      ]);
      if (shouldOfferPush({ rsvp, state, offered })) {
        await markPushOffered().catch(() => undefined);
        setOfferPush(true);
      }
      await event.refresh();
    } catch {
      setMessage(t('loadError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[layout.contentStyle, { gap: 16 }]}
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
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <ShareEvent event={e} />
        </View>
      </View>

      {/* Tablet: ações à esquerda; participantes, mesas e partidas à direita. */}
      <SplitColumns
        gap={16}
        left={
          <>
            {e.status === 'scheduled' && (
              <Card>
                <AppText accessibilityRole="header" style={styles.sectionTitle}>
                  {t('rsvpTitle')}
                </AppText>
                <Choices
                  label={t('rsvpTitle')}
                  hideLabel
                  value={mine ?? null}
                  disabled={saving}
                  onChange={(value) => void answer(value)}
                  options={(['yes', 'maybe', 'no'] as const).map((value) => ({
                    value,
                    label: t(RSVP_LABEL[value]),
                  }))}
                />
                <AppText muted accessibilityLiveRegion="polite">
                  {message}
                </AppText>
              </Card>
            )}
            {offerPush && <PushOffer onClose={() => setOfferPush(false)} />}

            {e.status !== 'cancelled' && (
              <Card style={{ gap: 10 }}>
                <AppText accessibilityRole="header" style={styles.sectionTitle}>
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
            {/* Torneio neste encontro (9.1): quem organiza cria; a lista fica em Grupo → Torneios. */}
            {e.canManage && e.status !== 'cancelled' && (
              <Button
                label={t('tourCreateHere')}
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/torneios/novo', params: { encontro: e.id } })
                }
                style={{ alignSelf: 'flex-start' }}
              />
            )}
            {e.canManage && (
              <EventManage key={e.id + e.status} event={e} onDone={() => void event.refresh()} />
            )}
            {e.status === 'finished' && e.games.length > 0 && <EventRecap event={e} />}
          </>
        }
        right={
          <>
            <Card>
              <AppText accessibilityRole="header" style={styles.sectionTitle}>
                {t('participants')}
              </AppText>
              {[...e.participants]
                .sort((a, b) => RSVP_ORDER[a.rsvp] - RSVP_ORDER[b.rsvp])
                .map((p) => (
                  <View
                    key={p.userId}
                    accessible
                    accessibilityLabel={`${p.name}, ${t(RSVP_LABEL[p.rsvp])}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <Avatar name={p.name} image={p.image} size={32} />
                    <AppText style={{ flex: 1 }} numberOfLines={1}>
                      {p.name}
                    </AppText>
                    <AppText muted>{t(RSVP_LABEL[p.rsvp])}</AppText>
                  </View>
                ))}
            </Card>

            {e.status === 'scheduled' && (
              <TableSuggestions
                eventId={e.id}
                confirmed={e.participants.filter((p) => p.rsvp === 'yes').length}
              />
            )}

            {e.games.length > 0 && (
              <Card>
                <AppText accessibilityRole="header" style={styles.sectionTitle}>
                  {t('games')}
                </AppText>
                {e.games.map((g) => (
                  <View key={g.id} style={{ gap: 6 }}>
                    <AppText style={{ fontWeight: '600' }}>
                      {t('game', { number: g.number })}
                    </AppText>
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
                    {e.canManage && (
                      <View style={{ alignSelf: 'flex-start' }}>
                        <ConfirmButton
                          label={t('gameRemove')}
                          confirmLabel={t('gameRemoveConfirm')}
                          context={t('game', { number: g.number })}
                          onConfirm={async () => {
                            try {
                              await api.games.remove(g.id);
                              setMessage(t('gameRemoved', { number: g.number }));
                              await event.refresh();
                            } catch {
                              setMessage(t('loadError'));
                            }
                          }}
                        />
                      </View>
                    )}
                  </View>
                ))}
                <AppText muted accessibilityLiveRegion="polite">
                  {message}
                </AppText>
              </Card>
            )}
          </>
        }
      />
    </ScrollView>
  );
}
