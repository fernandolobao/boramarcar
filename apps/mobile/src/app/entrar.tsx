import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Entrar com o Google (abre o navegador do sistema e volta para o app). */
export default function SignIn() {
  const colors = useColors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
      <View style={{ gap: 8, alignItems: 'center', maxWidth: 360 }}>
        <AppText accessibilityRole="header" style={{ fontSize: 32, fontWeight: '800' }}>
          {t('appName')}
        </AppText>
        <AppText muted style={{ textAlign: 'center' }}>
          {t('signInTitle')}
        </AppText>
      </View>
      <Button
        label={pending ? t('signingIn') : t('signInGoogle')}
        disabled={pending}
        style={{ alignSelf: 'stretch', maxWidth: 360 }}
        onPress={async () => {
          setPending(true);
          setError(false);
          const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
          if (result.error) setError(true);
          setPending(false);
        }}
      />
      {error && (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {t('signInError')}
        </AppText>
      )}
    </SafeAreaView>
  );
}
