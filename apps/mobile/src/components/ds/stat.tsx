import { statLabel, type StatProps } from '@boramarcar/ui';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { useColors } from '@/lib/theme';

/** Cartão de número do design system no app (mesma API do site): lido como "rótulo: valor, dica". */
export function Stat({ label, value, hint }: StatProps) {
  const colors = useColors();
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
      }}
      accessible
      accessibilityLabel={statLabel(label, value, hint)}
    >
      <AppText muted>{label}</AppText>
      <AppText style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      {hint ? <AppText muted>{hint}</AppText> : null}
    </View>
  );
}
