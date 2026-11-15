import {
  clampNumber,
  parseNumberInput,
  stepNumber,
  stepperLabel,
  type NumberFieldProps,
} from '@boramarcar/ui';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { t, tRaw } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/**
 * Campo numérico do design system (mesmo contrato do site): −/+ com o valor atual no nome
 * acessível, e tocar no valor permite digitar (confirma ao sair, ajustado aos limites).
 * `tone="onDark"` para áreas coloridas (modo mesa); `compact` para listas densas.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  description,
  error,
  disabled,
  labels,
  tone = 'default',
  compact = false,
}: Omit<NumberFieldProps, 'labels'> & {
  labels?: NumberFieldProps['labels'];
  tone?: 'default' | 'onDark';
  compact?: boolean;
}) {
  const colors = useColors();
  const texts = labels ?? { decrease: tRaw('dsDecrease'), increase: tRaw('dsIncrease') };
  const [draft, setDraft] = useState<string | null>(null);
  const dark = tone === 'onDark';
  const fg = dark ? '#ffffff' : colors.text;
  const muted = dark ? '#ffffff' : colors.muted;
  const canDown = !disabled && value !== null && (min === undefined || value > min);
  const canUp = !disabled && (value === null || max === undefined || value < max);
  const step1 = (delta: 1 | -1) => onChange(stepNumber(value, delta, { min, max, step }));
  const commitDraft = () => {
    if (draft === null) return;
    const n = parseNumberInput(draft);
    setDraft(null);
    onChange(n === null ? null : clampNumber(n, min, max));
  };
  const size = compact ? { width: 40, height: 36 } : { width: 48, height: 44 };
  const button = (direction: 'down' | 'up', enabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stepperLabel(label, direction, value, texts)}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => step1(direction === 'up' ? 1 : -1)}
      style={({ pressed }) => ({
        ...size,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: dark ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: dark ? 'rgba(255,255,255,0.15)' : colors.surface,
        opacity: !enabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: fg, fontSize: compact ? 20 : 22, fontWeight: '800' }}>
        {direction === 'up' ? '+' : '−'}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 6 : 8 }}>
        <Text
          style={{
            flex: 1,
            color: compact && !dark ? muted : fg,
            fontSize: compact ? 13 : 16,
            fontWeight: compact ? '400' : '600',
          }}
          numberOfLines={2}
          maxFontSizeMultiplier={1.6}
        >
          {label}
        </Text>
        {button('down', canDown)}
        {draft !== null ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel={label}
            selectTextOnFocus
            style={{
              minWidth: 56,
              height: size.height,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: '800',
              color: fg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: dark ? 'rgba(255,255,255,0.5)' : colors.border,
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ?? '—'}`}
            accessibilityHint={t('dsEditHint')}
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => setDraft(value === null ? '' : String(value))}
            hitSlop={6}
          >
            <Text
              style={{
                minWidth: compact ? 28 : 40,
                textAlign: 'center',
                fontSize: compact ? 16 : 20,
                fontWeight: '800',
                color: fg,
                fontVariant: ['tabular-nums'],
              }}
              accessibilityLiveRegion="polite"
            >
              {value ?? '—'}
            </Text>
          </Pressable>
        )}
        {button('up', canUp)}
      </View>
      {description ? (
        <Text style={{ color: muted, fontSize: 13 }} maxFontSizeMultiplier={1.6}>
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: dark ? '#ffffff' : colors.danger, fontWeight: '600' }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
