import type { EventDetail } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { localRangeToUtc, utcToZonedLocalInput } from '@boramarcar/core/time';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField, TimeStepper } from '@/components/fields';
import { AppText, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { dayLabel, deviceTimeZone, localDate, nextDays, rangeLabel } from '@/lib/dates';
import { formatDateTime, t } from '@/lib/i18n';
import { useGroup } from '@/lib/group';
import { useAsync } from '@/lib/use-async';

/** Texto para compartilhar o encontro, igual ao do site (WhatsApp, folha nativa). */
export function eventShareText(event: EventDetail, timeZone: string) {
  const when = event.endsAt
    ? rangeLabel(event.startsAt, event.endsAt, timeZone)
    : formatDateTime(event.startsAt);
  const confirmed = event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.name);
  return [
    event.status === 'cancelled'
      ? t('shareCancelled', { title: event.title })
      : t('shareTitle', { title: event.title }),
    t('shareWhen', { when }),
    t('shareWhere', { where: event.location?.name ?? t('locationTbd') }),
    confirmed.length
      ? t('shareConfirmed', { count: confirmed.length, names: confirmed.join(', ') })
      : null,
    t('shareLink', { url: `${API_URL}/eventos/${event.id}` }),
  ]
    .filter(Boolean)
    .join('\n');
}

export function ShareEvent({ event }: { event: EventDetail }) {
  return (
    <Button
      label={t('eventShare')}
      variant="secondary"
      onPress={() => void Share.share({ message: eventShareText(event, deviceTimeZone()) })}
    />
  );
}

/** Edição do encontro e ações de situação (quem criou ou admins), como no site. */
export function EventManage({ event, onDone }: { event: EventDetail; onDone: () => void }) {
  const { group } = useGroup();
  const timeZone = deviceTimeZone();
  const locations = useAsync(
    () => (group ? api.locations.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const currentDay = localDate(event.startsAt, timeZone);
  const days = [...new Set([currentDay, ...nextDays(60, timeZone)])];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [day, setDay] = useState(currentDay);
  const [start, setStart] = useState(utcToZonedLocalInput(event.startsAt, timeZone).slice(11));
  const [hasEnd, setHasEnd] = useState(Boolean(event.endsAt));
  const [end, setEnd] = useState(
    event.endsAt ? utcToZonedLocalInput(event.endsAt, timeZone).slice(11) : '23:00',
  );
  const [locationId, setLocationId] = useState<string | null>(event.location?.id ?? null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setSaving(true);
    setMessage('');
    try {
      await action();
      setMessage(done);
      onDone();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setSaving(false);
    }
  };
  const save = () => {
    if (!title.trim()) return setMessage(t('eventNeedTitle'));
    if (hasEnd && start === end) return setMessage(t('eventSameTime'));
    void run(
      () =>
        api.events.update(event.id, {
          title: title.trim(),
          ...localRangeToUtc(day, start, hasEnd ? end : null, timeZone),
          locationId,
        }),
      t('eventSaved'),
    );
  };

  return (
    <Card style={{ gap: 12 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('eventManage')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={t('eventEdit')}
          variant="secondary"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
        />
        {event.status === 'scheduled' ? (
          <ConfirmButton
            label={t('eventCancel')}
            confirmLabel={t('eventCancelConfirm')}
            context={event.title}
            disabled={saving}
            onConfirm={() =>
              run(() => api.events.setStatus(event.id, 'cancelled'), t('eventCancelled'))
            }
          />
        ) : (
          <Button
            label={t('eventReopen')}
            variant="secondary"
            disabled={saving}
            onPress={() =>
              void run(() => api.events.setStatus(event.id, 'scheduled'), t('eventReopened'))
            }
          />
        )}
      </View>
      {open && (
        <View style={{ gap: 14 }}>
          <TextField
            label={t('eventTitleLabel')}
            maxLength={120}
            value={title}
            onChangeText={setTitle}
          />
          <View style={{ gap: 6 }}>
            <AppText style={{ fontWeight: '600' }}>{t('eventDay')}</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('eventDay')}
            >
              {days.map((d) => (
                <Button
                  key={d}
                  label={dayLabel(d)}
                  variant="secondary"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: day === d }}
                  selected={day === d}
                  onPress={() => setDay(d)}
                />
              ))}
            </ScrollView>
          </View>
          <TimeStepper label={t('eventStart')} value={start} onChange={setStart} />
          <Button
            label={t('eventSetEnd')}
            variant="secondary"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasEnd }}
            selected={hasEnd}
            onPress={() => setHasEnd((v) => !v)}
            style={{ alignItems: 'flex-start' }}
          />
          {hasEnd && <TimeStepper label={t('eventEnd')} value={end} onChange={setEnd} />}
          <View style={{ gap: 6 }}>
            <AppText style={{ fontWeight: '600' }}>{t('eventLocation')}</AppText>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('eventLocation')}
            >
              {[
                { id: null as string | null, name: t('eventNoLocation') },
                ...(locations.data ?? []),
              ].map((l) => (
                <Button
                  key={l.id ?? 'none'}
                  label={l.name}
                  variant="secondary"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: locationId === l.id }}
                  selected={locationId === l.id}
                  onPress={() => setLocationId(l.id)}
                />
              ))}
            </View>
          </View>
          <Button
            label={saving ? t('settingsSaving') : t('eventSave')}
            disabled={saving}
            onPress={save}
          />
        </View>
      )}
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </Card>
  );
}
