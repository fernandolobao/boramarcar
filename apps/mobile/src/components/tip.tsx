import { radius } from '@boramarcar/tokens';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
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
 * Dica de uma tela densa (onboarding 7.4, como no site): um botão ⓘ à direita abre e fecha a
 * dica. Na primeira vez ela vem aberta; "Entendi" fecha e grava (servidor; vale no site também),
 * e a dica continua a um toque no ⓘ. Sem rede, não aparece (nunca atrapalha a tela).
 */
export function Tip({ id }: { id: TipId }) {
  const colors = useColors();
  const dismissed = useAsync(() => api.me.dismissedTips(), []);
  const [open, setOpen] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (dismissed.data && open === null) {
      const seen = dismissed.data.includes(id);
      setSaved(seen);
      setOpen(!seen);
    }
  }, [dismissed.data, id, open]);
  if (open === null) return null;

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tipToggle')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => ({
          alignSelf: 'flex-end',
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: open ? colors.surfaceMuted : colors.surface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText style={{ fontSize: 18, fontWeight: '800', color: colors.brand }}>i</AppText>
      </Pressable>
      {open && (
        <View
          style={{
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: radius.control,
            // Compacta e sem borda forte, como a dica do site.
            backgroundColor: colors.surfaceMuted,
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
            style={{ alignSelf: 'flex-start', minHeight: 40 }}
            onPress={() => {
              setOpen(false);
              if (!saved) {
                setSaved(true);
                void api.me.markOnboarding(`tip-${id}`).catch(() => undefined);
              }
            }}
          />
        </View>
      )}
    </View>
  );
}
