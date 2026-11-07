import type { AvailabilityRule } from '@boramarcar/api-client';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { AddAvailability } from '@/components/availability/add-form';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { dayLabel, deviceTimeZone, rangeLabel, weekdayName } from '@/lib/dates';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

/** Ação destrutiva em dois toques (padrão do projeto): o primeiro pede confirmação. */
function ConfirmButton({
  label,
  context,
  onConfirm,
}: {
  label: string;
  context: string;
  onConfirm: () => Promise<void>;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      label={armed ? t('availConfirm') : label}
      accessibilityLabel={armed ? `${t('availConfirm')}: ${context}` : `${label}: ${context}`}
      variant={armed ? 'primary' : 'secondary'}
      disabled={busy}
      onPress={async () => {
        if (!armed) return setArmed(true);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    />
  );
}

/** Disponibilidade (5.4): melhores horários, adicionar, regras semanais e o que o grupo marcou. */
export default function AvailabilityScreen() {
  const { group } = useGroup();
  const { data: session } = authClient.useSession();
  const colors = useColors();
  const timeZone = deviceTimeZone();
  const me = session?.user.id;
  const data = useAsync(async () => {
    if (!group) return null;
    const [windows, slots, rules, locations] = await Promise.all([
      api.availability.windows(group.id),
      api.availability.list(group.id),
      api.rules.list(group.id),
      api.locations.list(group.id),
    ]);
    return { windows, slots, rules, locations };
  }, [group?.id]);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  if (!group) return <AppText style={{ padding: 24 }}>{t('noGroup')}</AppText>;
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorState error={data.error} onRetry={data.refresh} />;
  const { windows, slots, rules, locations } = data.data;
  const locationName = new Map(locations.map((l) => [l.id, l.name]));
  const where = (ids: string[]) =>
    ids.length ? ids.map((id) => locationName.get(id) ?? id).join(', ') : t('availAnyLocation');
  const ruleSummary = (r: AvailabilityRule) =>
    t('availRuleSummary', { weekday: weekdayName(r.weekday), start: r.startTime, end: r.endTime });
  const myRules = rules.filter((r) => r.userId === me);

  /** Roda uma ação, avisa o resultado e recarrega a tela. */
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setMessage('');
    try {
      await fn();
      setMessage(done);
      await data.refresh();
    } catch {
      setMessage(t('availSaveError'));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <AppText accessibilityRole="header" style={styles.title}>
        {t('availTitle')}
      </AppText>
      {message !== '' && (
        <AppText accessibilityLiveRegion="polite" style={{ fontWeight: '600' }}>
          {message}
        </AppText>
      )}

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {t('availWindows')}
        </AppText>
        {windows.length === 0 ? (
          <AppText muted>{t('availNoWindows')}</AppText>
        ) : (
          windows.map((w) => {
            const key = `${w.start.toISOString()}-${w.locationId}`;
            return (
              <View
                key={key}
                style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }}
              >
                <AppText style={{ fontWeight: '700' }}>
                  {rangeLabel(w.start, w.end, timeZone)}
                </AppText>
                <AppText muted>
                  {w.locationName ?? t('locationTbd')} · {w.players.map((p) => p.name).join(', ')}
                </AppText>
                <Button
                  label={t('availCreateEvent')}
                  accessibilityLabel={`${t('availCreateEvent')}: ${rangeLabel(w.start, w.end, timeZone)}`}
                  disabled={creating !== null}
                  onPress={async () => {
                    setCreating(key);
                    try {
                      const event = await api.events.create(group.id, {
                        title: t('availDefaultTitle'),
                        startsAt: w.start,
                        endsAt: w.end,
                        locationId: w.locationId,
                        participantIds: w.userIds,
                      });
                      router.push({ pathname: '/encontros/[id]', params: { id: event.id } });
                    } catch {
                      setMessage(t('availSaveError'));
                    } finally {
                      setCreating(null);
                    }
                  }}
                />
              </View>
            );
          })
        )}
      </Card>

      <AddAvailability
        groupId={group.id}
        locations={locations}
        onAdded={() => void data.refresh()}
      />

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {t('availMyRules')}
        </AppText>
        {myRules.length === 0 ? (
          <AppText muted>{t('availNoRules')}</AppText>
        ) : (
          myRules.map((rule) => (
            <View
              key={rule.id}
              style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }}
            >
              <AppText style={{ fontWeight: '700' }}>{ruleSummary(rule)}</AppText>
              <AppText muted>
                {where(rule.locationIds)}
                {rule.note ? ` · ${rule.note}` : ''}
              </AppText>
              {rule.exceptions.length > 0 && (
                <View style={{ gap: 6 }}>
                  <AppText muted>{t('availSkipped')}</AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {rule.exceptions.map((date) => (
                      <Button
                        key={date}
                        label={`↺ ${dayLabel(date)}`}
                        accessibilityLabel={t('availUnskip', { date: dayLabel(date) })}
                        variant="secondary"
                        onPress={() =>
                          void act(
                            () => api.rules.setException(rule.id, date, false),
                            t('availUnskipped', { date: dayLabel(date) }),
                          )
                        }
                      />
                    ))}
                  </View>
                </View>
              )}
              <ConfirmButton
                label={t('availRemove')}
                context={ruleSummary(rule)}
                onConfirm={() => act(() => api.rules.remove(rule.id), t('availRemoved'))}
              />
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
          {t('availEveryone')}
        </AppText>
        {slots.length === 0 ? (
          <AppText muted>{t('availEmpty')}</AppText>
        ) : (
          slots.map((slot) => {
            const when = rangeLabel(slot.startsAt, slot.endsAt, timeZone);
            const mine = slot.userId === me;
            return (
              <View
                key={slot.id}
                style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }}
              >
                <AppText style={{ fontWeight: '700' }}>
                  {slot.userName} · {when}
                  {slot.kind === 'weekly' ? `  ↻ ${t('availWeeklyTag')}` : ''}
                </AppText>
                <AppText muted>
                  {where(slot.locationIds)}
                  {slot.note ? ` · ${slot.note}` : ''}
                </AppText>
                {mine &&
                  (slot.kind === 'weekly' && slot.ruleId && slot.date ? (
                    <Button
                      label={t('availSkip')}
                      accessibilityLabel={t('availSkipLabel', { date: dayLabel(slot.date) })}
                      variant="secondary"
                      onPress={() =>
                        void act(
                          () => api.rules.setException(slot.ruleId!, slot.date!, true),
                          t('availSkippedDone', { date: dayLabel(slot.date!) }),
                        )
                      }
                    />
                  ) : (
                    <ConfirmButton
                      label={t('availRemove')}
                      context={when}
                      onConfirm={() =>
                        act(() => api.availability.remove(slot.id), t('availRemoved'))
                      }
                    />
                  ))}
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}
