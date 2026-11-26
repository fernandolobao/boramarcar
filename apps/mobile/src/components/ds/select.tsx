import { selectedOption, type SelectProps } from '@boramarcar/ui';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { t, tRaw } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { Icon } from '@/components/icons';

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/**
 * Lista de seleção do design system no app (mesma API do site): campo-botão com a opção escolhida;
 * o toque abre a lista numa folha, cada opção como botão com estado `selected`. Para poucas opções
 * curtas, prefira `Choices`.
 */
export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  description,
  error,
  disabled,
}: SelectProps<T>) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const shown = selectedOption(options, value)?.label ?? placeholder ?? t('dsSelectEmpty');

  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fill(tRaw('dsSelectOpen'), { label, value: shown })}
        accessibilityHint={description}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        })}
      >
        <AppText style={{ fontSize: 16, flexShrink: 1 }} numberOfLines={1}>
          {shown}
        </AppText>
        <Icon name="chevronDown" color={colors.muted} />
      </Pressable>
      {description ? <AppText muted>{description}</AppText> : null}
      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
          <ScrollView
            style={{
              maxHeight: '80%',
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            accessibilityViewIsModal
          >
            <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18 }}>
              {label}
            </AppText>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  accessibilityState={{ selected, disabled: o.disabled }}
                  disabled={o.disabled}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: selected ? colors.surfaceMuted : 'transparent',
                    opacity: o.disabled ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  <AppText style={{ fontSize: 16, fontWeight: selected ? '700' : '400' }}>
                    {o.label}
                  </AppText>
                  {selected ? <Icon name="done" color={colors.text} /> : null}
                </Pressable>
              );
            })}
            <Button label={t('dsSelectClose')} variant="secondary" onPress={() => setOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
