import type { Location } from '@boramarcar/api-client';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import {
  dayLabel,
  deviceTimeZone,
  nextDays,
  slotRange,
  stepTime,
  WEEKDAY_ORDER,
  weekdayName,
} from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

/** Horário com −/+ de meia em meia hora (sem relógio nativo, funciona no Expo Go e no leitor de tela). */
function TimeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText style={{ flex: 1, fontWeight: '600' }}>{label}</AppText>
      <Button
        label="−"
        variant="secondary"
        accessibilityLabel={t('availEarlier', { label, time: value })}
        onPress={() => onChange(stepTime(value, -1))}
        style={{ width: 48, paddingHorizontal: 0 }}
      />
      <AppText
        style={{ minWidth: 64, textAlign: 'center', fontSize: 20, fontWeight: '700' }}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityLiveRegion="polite"
      >
        {value}
      </AppText>
      <Button
        label="+"
        variant="secondary"
        accessibilityLabel={t('availLater', { label, time: value })}
        onPress={() => onChange(stepTime(value, 1))}
        style={{ width: 48, paddingHorizontal: 0 }}
      />
    </View>
  );
}

/** Adicionar disponibilidade: uma vez (dia + horário) ou toda semana (dias + horário). */
export function AddAvailability({
  groupId,
  locations,
  onAdded,
}: {
  groupId: string;
  locations: Location[];
  onAdded: () => void;
}) {
  const colors = useColors();
  const timeZone = deviceTimeZone();
  const days = nextDays(14, timeZone);
  const [frequency, setFrequency] = useState<'once' | 'weekly'>('once');
  const [day, setDay] = useState(days[0]!);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('23:00');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const save = async () => {
    setMessage(null);
    if (frequency === 'weekly' && weekdays.length === 0) {
      setMessage({ text: t('availChooseWeekday'), error: true });
      return;
    }
    if (start === end) {
      setMessage({ text: t('availSameTime'), error: true });
      return;
    }
    setSaving(true);
    try {
      if (frequency === 'once') {
        await api.availability.add(groupId, {
          ...slotRange(day, start, end, timeZone),
          locationIds: selected,
          note: note.trim() || null,
        });
      } else {
        await api.rules.add(groupId, {
          weekdays,
          startTime: start,
          endTime: end,
          timeZone,
          locationIds: selected,
          note: note.trim() || null,
        });
      }
      setNote('');
      setWeekdays([]);
      setMessage({ text: t('availAdded'), error: false });
      onAdded();
    } catch {
      setMessage({ text: t('availSaveError'), error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
        {t('availAdd')}
      </AppText>

      <View style={row} accessibilityRole="radiogroup" accessibilityLabel={t('availFrequency')}>
        {(['once', 'weekly'] as const).map((value) => (
          <Button
            key={value}
            label={t(value === 'once' ? 'availOnce' : 'availWeekly')}
            variant="secondary"
            accessibilityRole="radio"
            accessibilityState={{ checked: frequency === value }}
            selected={frequency === value}
            onPress={() => setFrequency(value)}
          />
        ))}
      </View>

      {frequency === 'once' ? (
        <View style={{ gap: 6 }}>
          <AppText style={{ fontWeight: '600' }}>{t('availDay')}</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('availDay')}
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
      ) : (
        <View style={{ gap: 6 }}>
          <AppText style={{ fontWeight: '600' }}>{t('availWeekdays')}</AppText>
          <View style={row}>
            {WEEKDAY_ORDER.map((w) => (
              <Button
                key={w}
                label={weekdayName(w, 'short')}
                accessibilityLabel={weekdayName(w)}
                variant="secondary"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: weekdays.includes(w) }}
                selected={weekdays.includes(w)}
                onPress={() => setWeekdays((list) => toggle(list, w))}
              />
            ))}
          </View>
        </View>
      )}

      <TimeStepper label={t('availFrom')} value={start} onChange={setStart} />
      <TimeStepper label={t('availUntil')} value={end} onChange={setEnd} />
      <AppText muted>{t('availOvernightHint')}</AppText>

      {locations.length > 0 && (
        <View style={{ gap: 6 }}>
          <AppText style={{ fontWeight: '600' }}>{t('availLocations')}</AppText>
          <AppText muted>{t('availLocationsHint')}</AppText>
          <View style={row}>
            {locations.map((l) => (
              <Button
                key={l.id}
                label={l.name}
                variant="secondary"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected.includes(l.id) }}
                selected={selected.includes(l.id)}
                onPress={() => setSelected((list) => toggle(list, l.id))}
              />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <AppText style={{ fontWeight: '600' }}>{t('availNote')}</AppText>
        <TextInput
          accessibilityLabel={t('availNote')}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          maxFontSizeMultiplier={2}
          style={{
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.background,
          }}
        />
      </View>

      <Button label={t('availAdd')} disabled={saving} onPress={() => void save()} />
      {message && (
        <AppText
          accessibilityRole={message.error ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={{ color: message.error ? colors.danger : colors.success }}
        >
          {message.text}
        </AppText>
      )}
    </Card>
  );
}
