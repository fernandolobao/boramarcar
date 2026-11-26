import type { CheckboxProps } from '@boramarcar/ui';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from '@/components/ui';

/**
 * Caixa de marcar do design system no app (mesma API do site): chip com papel `checkbox` e estado
 * `checked`. `accessibilityLabel` quando o nome precisa de mais que o texto visível (ex.: dia da
 * semana abreviado); `description` vira a dica de acessibilidade.
 */
export function Checkbox({
  label,
  checked,
  onChange,
  description,
  disabled,
  accessibilityLabel,
  style,
}: CheckboxProps & { accessibilityLabel?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Button
      // Marca visível além da cor (WCAG 1.4.1); o nome acessível fica sem ela.
      label={label}
      icon={checked ? 'done' : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={description}
      variant="secondary"
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      // Também em aria-*: o React Native atual e o React Native Web leem estes.
      aria-checked={checked}
      aria-disabled={disabled}
      selected={checked}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={style}
    />
  );
}
