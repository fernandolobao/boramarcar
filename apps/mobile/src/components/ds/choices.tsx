import type { ChoicesProps } from '@boramarcar/ui';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { useColors } from '@/lib/theme';

/**
 * Escolha única do design system (mesmo contrato do site): chips com papel `radio` e estado
 * `checked`, num `radiogroup` com nome. `scroll` = uma linha horizontal rolável (ex.: dias).
 * `hideLabel` quando já há um título visível logo acima (o nome continua no grupo).
 */
export function Choices<T extends string>({
  label,
  value,
  onChange,
  options,
  description,
  error,
  orientation = 'horizontal',
  scroll = false,
  hideLabel = false,
  disabled = false,
  optionLabel,
}: ChoicesProps<T> & {
  scroll?: boolean;
  hideLabel?: boolean;
  disabled?: boolean;
  /** Nome acessível de cada opção, quando precisa de mais contexto que o texto (ex.: "Deck de Ana: Omnath"). */
  optionLabel?: (option: { value: T; label: string }) => string;
}) {
  const colors = useColors();
  const chips = options.map((o) => (
    <Button
      key={o.value}
      label={o.description ? `${o.label} · ${o.description}` : o.label}
      accessibilityLabel={optionLabel?.(o)}
      variant="secondary"
      accessibilityRole="radio"
      accessibilityState={{ checked: value === o.value, disabled: disabled || o.disabled }}
      // Também em aria-*: o React Native atual e o React Native Web leem estes.
      aria-checked={value === o.value}
      aria-disabled={disabled || o.disabled}
      selected={value === o.value}
      disabled={disabled || o.disabled}
      onPress={() => onChange(o.value)}
      style={orientation === 'vertical' ? { alignItems: 'flex-start' } : undefined}
    />
  ));
  const group =
    scroll && orientation === 'horizontal' ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {chips}
      </ScrollView>
    ) : (
      <View
        style={
          orientation === 'vertical'
            ? { gap: 8 }
            : { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
        }
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {chips}
      </View>
    );
  return (
    <View style={{ gap: 6 }}>
      {!hideLabel && (
        <Text
          style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}
          maxFontSizeMultiplier={2}
        >
          {label}
        </Text>
      )}
      {group}
      {description ? (
        <Text style={{ color: colors.muted, fontSize: 14 }} maxFontSizeMultiplier={2}>
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontWeight: '600' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
