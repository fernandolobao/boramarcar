import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/lib/config';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

type Status = 'checking' | 'online' | 'offline';

/** O servidor responde? (`/api/auth/ok` do Better Auth, com tempo máximo.) */
async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/api/auth/ok`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Entrar com o Google (abre o navegador do sistema e volta para o app). */
export default function SignIn() {
  const colors = useColors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<'signIn' | 'offline' | 'expoGo' | null>(null);
  /** Código do erro do servidor, para quem for investigar ("INVALID_CALLBACK_URL", 403…). */
  const [detail, setDetail] = useState('');
  const [status, setStatus] = useState<Status>('checking');

  const check = async () => {
    setStatus('checking');
    const ok = await ping();
    setStatus(ok ? 'online' : 'offline');
    return ok;
  };
  useEffect(() => {
    void check();
  }, []);

  const signIn = async () => {
    setPending(true);
    setError(null);
    setDetail('');
    try {
      if (status !== 'online' && !(await check())) {
        setError('offline');
        return;
      }
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
      if (result.error) {
        const { code, status, message } = result.error;
        setDetail([code ?? message, status].filter(Boolean).join(' · '));
        // O servidor recusou voltar para o Expo Go (exp://): falta liberar no servidor.
        setError(code === 'INVALID_CALLBACK_URL' ? 'expoGo' : 'signIn');
      }
    } catch {
      // Sem resposta do servidor (tempo esgotado, outra rede…): mostra o erro em vez de travar.
      setError('offline');
      setStatus('offline');
    } finally {
      setPending(false);
    }
  };

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
        onPress={() => void signIn()}
      />
      {error && (
        <AppText
          accessibilityRole="alert"
          style={{ color: colors.danger, textAlign: 'center', maxWidth: 360 }}
        >
          {error === 'offline'
            ? t('serverUnreachable', { url: API_URL })
            : error === 'expoGo'
              ? t('signInExpoGo')
              : t('signInError')}
          {detail ? `\n(${detail})` : ''}
        </AppText>
      )}
      {status === 'offline' && !error && (
        <View style={{ gap: 8, alignItems: 'center', maxWidth: 360 }}>
          <AppText accessibilityRole="alert" style={{ color: colors.danger, textAlign: 'center' }}>
            {t('serverUnreachable', { url: API_URL })}
          </AppText>
          <Button label={t('retry')} variant="secondary" onPress={() => void check()} />
        </View>
      )}
      <AppText muted style={{ fontSize: 13, textAlign: 'center' }}>
        {t('serverLabel', { url: API_URL })}
        {status === 'checking' ? ` · ${t('serverChecking')}` : ''}
      </AppText>
    </SafeAreaView>
  );
}
