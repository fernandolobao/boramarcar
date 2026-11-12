import { ApiError } from '@boramarcar/api-client';
import { localRangeToUtc } from '@boramarcar/core/time';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TextField, TimeStepper } from '@/components/fields';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { dayLabel, deviceTimeZone, nextDays } from '@/lib/dates';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';
import { NoGroup } from '@/components/no-group';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

/**
 * Criar encontro pelo app (5.4): título, dia, horário de início (e de término, opcional) e local
 * do grupo. Os horários são do fuso do aparelho, convertidos com `zonedLocalToUtc` (core). Quem cria
 * entra confirmado; o servidor avisa o grupo. Para marcar a partir dos horários em que a mesa fecha,
 * a aba Disponibilidade tem o atalho.
 */
export default function NewEventScreen() {
  const { group, loading: loadingGroup, error: groupError, reload } = useGroup();
  const colors = useColors();
  const timeZone = deviceTimeZone();
  const days = nextDays(60, timeZone);
  const locations = useAsync(
    () => (group ? api.locations.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const [title, setTitle] = useState(t('eventDefaultTitle'));
  const [day, setDay] = useState(days[0]!);
  const [start, setStart] = useState('19:00');
  const [hasEnd, setHasEnd] = useState(false);
  const [end, setEnd] = useState('23:00');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (loadingGroup || locations.loading) return <Loading />;
  if (groupError) return <ErrorState error={groupError} onRetry={() => void reload()} />;
  if (!group) return <NoGroup />;
  if (locations.error) return <ErrorState error={locations.error} onRetry={locations.refresh} />;

  const save = async () => {
    setError('');
    if (!title.trim()) return setError(t('eventNeedTitle'));
    if (hasEnd && start === end) return setError(t('eventSameTime'));
    setSaving(true);
    try {
      const event = await api.events.create(group.id, {
        title: title.trim(),
        ...localRangeToUtc(day, start, hasEnd ? end : null, timeZone),
        locationId,
      });
      // Troca esta tela pelo encontro criado: "voltar" leva à lista, que recarrega no foco.
      router.replace({ pathname: '/encontros/[id]', params: { id: event.id } });
    } catch (e) {
      setError(
        t('eventCreateError', { message: e instanceof ApiError ? e.message : t('loadError') }),
      );
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: t('eventNewTitle') }} />
      <View>
        <AppText accessibilityRole="header" style={styles.title}>
          {t('eventNewTitle')}
        </AppText>
        <AppText muted>{group.name}</AppText>
      </View>

      <Card style={{ gap: 14 }}>
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
        {hasEnd && (
          <>
            <TimeStepper label={t('eventEnd')} value={end} onChange={setEnd} />
            <AppText muted>{t('availOvernightHint')}</AppText>
          </>
        )}

        <View style={{ gap: 6 }}>
          <AppText style={{ fontWeight: '600' }}>{t('eventLocation')}</AppText>
          <View style={row} accessibilityRole="radiogroup" accessibilityLabel={t('eventLocation')}>
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
      </Card>

      <AppText muted>{t('eventCreateHint')}</AppText>
      {error !== '' && (
        <AppText
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ color: colors.danger }}
        >
          {error}
        </AppText>
      )}
      <Button label={t('eventCreate')} disabled={saving} onPress={() => void save()} />
    </ScrollView>
  );
}
