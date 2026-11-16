import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from '@/components/ui';
import { useColors } from '@/lib/theme';

/** Horário com −/+ de meia em meia hora: agora é o `TimeField` do design system. */
export { TimeField as TimeStepper } from '@/components/ds/time-field';

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
