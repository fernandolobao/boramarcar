import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { stepTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Horário com −/+ de meia em meia hora (sem relógio nativo, funciona no Expo Go e no leitor de tela). */
export function TimeStepper({
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

/** Campo de texto com rótulo visível (o rótulo também é o nome acessível). */
export function TextField({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        maxFontSizeMultiplier={2}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.background,
          },
          props.style,
        ]}
      />
      {hint ? <AppText muted>{hint}</AppText> : null}
    </View>
  );
}
