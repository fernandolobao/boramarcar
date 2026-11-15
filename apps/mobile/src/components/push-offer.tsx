import { useState } from 'react';
import { Linking, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { enablePush, type PushState } from '@/lib/push';
import { t } from '@/lib/i18n';

/**
 * Onboarding 7.5: oferta de avisos na hora útil (logo depois de confirmar presença), dentro do
 * encontro, sem pop-up do sistema antes de a pessoa escolher. Aparece uma vez por aparelho.
 */
export function PushOffer({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<PushState | 'later' | null>(null);
  const [busy, setBusy] = useState(false);

  if (state === 'on' || state === 'later') {
    return (
      <Card>
        <AppText accessibilityLiveRegion="polite">
          {state === 'on' ? t('pushOfferOn') : t('pushOfferLaterNote')}
        </AppText>
        <Button label={t('pushOfferClose')} variant="secondary" onPress={onClose} />
      </Card>
    );
  }
  return (
    <Card style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('pushOfferTitle')}
      </AppText>
      <AppText>{t('pushOfferBody')}</AppText>
      {state === 'denied' ? (
        <>
          <AppText accessibilityRole="alert">{t('pushDenied')}</AppText>
          <Button
            label={t('pushOpenSettings')}
            variant="secondary"
            onPress={() => void Linking.openSettings()}
          />
        </>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={t('pushOfferEnable')}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setState(await enablePush().catch(() => 'off' as const));
              setBusy(false);
            }}
          />
          <Button
            label={t('pushOfferLater')}
            variant="secondary"
            disabled={busy}
            onPress={() => setState('later')}
          />
        </View>
      )}
    </Card>
  );
}
