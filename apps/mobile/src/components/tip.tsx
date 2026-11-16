import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

export type TipId = 'deck-analysis' | 'table' | 'collection';
const TEXT: Record<TipId, MessageKey> = {
  'deck-analysis': 'tipDeckAnalysis',
  table: 'tipTable',
  collection: 'tipCollection',
};

/**
 * Dica de uma tela densa (onboarding 7.4, como no site): no topo da tela, uma vez por pessoa,
 * sem janela por cima. "Entendi" dispensa para sempre (servidor; vale no site também).
 */
export function Tip({ id }: { id: TipId }) {
  const colors = useColors();
  const dismissed = useAsync(() => api.me.dismissedTips(), []);
  const [hidden, setHidden] = useState(false);
  // Sem rede ou carregando: não mostra (a dica nunca atrapalha a tela).
  if (hidden || !dismissed.data || dismissed.data.includes(id)) return null;
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('tipLabel')}
      </AppText>
      <AppText>{t(TEXT[id])}</AppText>
      <Button
        label={t('tipDismiss')}
        accessibilityLabel={t('tipDismissLabel')}
        variant="secondary"
        style={{ alignSelf: 'flex-start' }}
        onPress={() => {
          setHidden(true);
          void api.me.markOnboarding(`tip-${id}`).catch(() => undefined);
        }}
      />
    </View>
  );
}
