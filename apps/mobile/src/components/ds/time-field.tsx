import { stepTime } from '@boramarcar/ui';
import { View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { tRaw } from '@/lib/i18n';

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/**
 * Horário do design system no app (mesma API do site): −/+ de `step` minutos e o valor, sem
 * relógio nativo (funciona no Expo Go e no leitor de tela). Valor 'HH:MM', 24 horas.
 */
export function TimeField({
  label,
  value,
  onChange,
  step = 30,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText style={{ flex: 1, fontWeight: '600' }}>{label}</AppText>
      <Button
        label="−"
        variant="secondary"
        disabled={disabled}
        accessibilityLabel={fill(tRaw('dsTimeEarlier'), { label, value })}
        onPress={() => onChange(stepTime(value, -step))}
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
        disabled={disabled}
        accessibilityLabel={fill(tRaw('dsTimeLater'), { label, value })}
        onPress={() => onChange(stepTime(value, step))}
        style={{ width: 48, paddingHorizontal: 0 }}
      />
    </View>
  );
}
