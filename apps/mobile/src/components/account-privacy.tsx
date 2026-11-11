import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/**
 * Privacidade e dados (LGPD): política, baixar os dados (no site, onde o arquivo é salvo) e
 * excluir a conta no próprio app (exigência das lojas), com confirmação em dois toques.
 */
export function AccountPrivacy() {
  const colors = useColors();
  const [preview, setPreview] = useState<{ transfers: string[]; deletions: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.me
      .deletionPreview()
      .then(setPreview)
      .catch(() => setPreview(null));
  }, []);

  const remove = async () => {
    if (!confirming) return setConfirming(true);
    setPending(true);
    setError(false);
    try {
      await api.me.deleteAccount();
      // O servidor já apagou as sessões; aqui só limpa o login guardado no aparelho.
      await authClient.signOut().catch(() => undefined);
    } catch {
      setError(true);
      setPending(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={styles.title}>
          {t('privacyTitle')}
        </AppText>
        <Button
          label={t('privacyPolicy')}
          variant="secondary"
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacidade`)}
        />
        <Button
          label={t('privacyExport')}
          variant="secondary"
          accessibilityHint={t('privacyExportHint')}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/configuracoes`)}
        />
        <AppText muted>{t('privacyDeleteHint')}</AppText>
        {preview?.transfers.length ? (
          <AppText>{t('privacyDeleteTransfers', { groups: preview.transfers.join(', ') })}</AppText>
        ) : null}
        {preview?.deletions.length ? (
          <AppText>{t('privacyDeleteDeletions', { groups: preview.deletions.join(', ') })}</AppText>
        ) : null}
        <Button
          label={
            pending
              ? t('privacyDeleting')
              : confirming
                ? t('privacyConfirmDelete')
                : t('privacyDelete')
          }
          variant="secondary"
          disabled={pending}
          onPress={() => void remove()}
        />
        {confirming && !pending && (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {t('privacyConfirmHint')}
          </AppText>
        )}
        {error && (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {t('privacyDeleteError')}
          </AppText>
        )}
      </View>
    </Card>
  );
}
