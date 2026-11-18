import type { SwitchProps } from '@boramarcar/ui';
import { Switch as NativeSwitch, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useColors } from '@/lib/theme';

/**
 * Interruptor do design system no app (mesma API do site): o `Switch` do sistema com o rótulo ao
 * lado e a dica embaixo (e como dica de acessibilidade). Para configurações com efeito imediato
 * ou salvas na mesma tela.
 */
export function Switch({ label, checked, onChange, description, disabled }: SwitchProps) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AppText style={{ flex: 1, fontWeight: '700' }}>{label}</AppText>
        <NativeSwitch
          accessibilityLabel={label}
          accessibilityHint={description}
          value={checked}
          disabled={disabled}
          onValueChange={onChange}
          trackColor={{ true: colors.brand, false: colors.border }}
        />
      </View>
      {description ? <AppText muted>{description}</AppText> : null}
    </View>
  );
}
