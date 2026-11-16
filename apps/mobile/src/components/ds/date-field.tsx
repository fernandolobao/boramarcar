import { addMonthsToDate, compareDates, monthGrid } from '@boramarcar/ui';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { locale, t, tRaw } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );
const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
/** Domingo primeiro no português e no inglês (EUA), como os calendários do aparelho. */
const WEEK_START = 0;

/**
 * Data do design system no app (mesma API do site): campo-botão com a data por extenso; o toque
 * abre o mês numa folha, com dias como botões de nome completo e os fora de `min`/`max`
 * desabilitados. Valor 'AAAA-MM-DD' (ou `null`).
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value ?? min ?? today()).slice(0, 7) + '-01');
  const shown = value
    ? format(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : t('dsDateEmpty');
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const weeks = monthGrid(year, monthNumber, WEEK_START);
  const weekdays = weeks[0]!.map((_, i) => format(`2026-11-0${i + 1}`, { weekday: 'narrow' }));
  const outside = (d: string) =>
    (min !== undefined && compareDates(d, min) < 0) ||
    (max !== undefined && compareDates(d, max) > 0);

  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fill(tRaw('dsDateOpen'), { label, value: shown })}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setMonth((value ?? min ?? today()).slice(0, 7) + '-01');
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: 48,
          justifyContent: 'center',
          paddingHorizontal: 12,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        })}
      >
        <AppText style={{ fontSize: 16 }}>{shown}</AppText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
          <ScrollView
            style={{
              maxHeight: '80%',
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            accessibilityViewIsModal
          >
            <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
              {label}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Button
                label="‹"
                variant="secondary"
                accessibilityLabel={t('dsPreviousMonth')}
                onPress={() => setMonth(addMonthsToDate(month, -1))}
                style={{ width: 48, paddingHorizontal: 0 }}
              />
              <AppText
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: '700',
                  textTransform: 'capitalize',
                }}
                accessibilityLiveRegion="polite"
              >
                {format(month, { month: 'long', year: 'numeric' })}
              </AppText>
              <Button
                label="›"
                variant="secondary"
                accessibilityLabel={t('dsNextMonth')}
                onPress={() => setMonth(addMonthsToDate(month, 1))}
                style={{ width: 48, paddingHorizontal: 0 }}
              />
            </View>
            <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
              {weekdays.map((w, i) => (
                <AppText
                  key={i}
                  muted
                  style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}
                >
                  {w}
                </AppText>
              ))}
            </View>
            {weeks.map((week, w) => (
              <View key={w} style={{ flexDirection: 'row', gap: 4 }}>
                {week.map((day, i) => {
                  if (!day) return <View key={i} style={{ flex: 1 }} />;
                  const selected = day === value;
                  const blocked = outside(day);
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityLabel={format(day, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      accessibilityState={{ selected, disabled: blocked }}
                      disabled={blocked}
                      onPress={() => {
                        onChange(day);
                        setOpen(false);
                      }}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        backgroundColor: selected ? colors.brand : 'transparent',
                        opacity: blocked ? 0.35 : 1,
                      }}
                    >
                      <AppText
                        style={{
                          fontWeight: selected ? '800' : '500',
                          color: selected ? '#ffffff' : colors.text,
                        }}
                      >
                        {Number(day.slice(8))}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Button
              label={t('dsCalendarClose')}
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
