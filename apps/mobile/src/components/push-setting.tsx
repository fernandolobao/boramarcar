import { useEffect, useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { AppText, Button, Card, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push';
import { useColors } from '@/lib/theme';

/**
 * "Avisos neste celular": liga/desliga o push. A permissão do sistema só é pedida ao ligar.
 * Permissão negada leva às configurações do sistema; sem build próprio, explica o porquê.
 */
export function PushSetting() {
  const colors = useColors();
  const [state, setState] = useState<PushState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void getPushState()
      .then(setState)
      .catch(() => setState('unavailable'));
  }, []);

  const toggle = async (on: boolean) => {
    setPending(true);
    setError(false);
    try {
      setState(await (on ? enablePush() : disablePush()));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  if (state === null) return null;
  return (
    <Card>
      <View style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={styles.title}>
          {t('pushTitle')}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText style={{ flex: 1 }}>{t('pushToggle')}</AppText>
          <Switch
            accessibilityLabel={t('pushToggle')}
            accessibilityHint={t('pushHint')}
            value={state === 'on'}
            disabled={pending || state === 'unavailable'}
            onValueChange={(on) => void toggle(on)}
            trackColor={{ true: colors.brand, false: colors.border }}
          />
        </View>
        <AppText muted>{t('pushHint')}</AppText>
        {state === 'denied' && (
          <>
            <AppText accessibilityRole="alert">{t('pushDenied')}</AppText>
            <Button
              label={t('pushOpenSettings')}
              variant="secondary"
              onPress={() => void Linking.openSettings()}
            />
          </>
        )}
        {state === 'unavailable' && <AppText muted>{t('pushUnavailable')}</AppText>}
        {error && (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {t('pushError')}
          </AppText>
        )}
      </View>
    </Card>
  );
}
