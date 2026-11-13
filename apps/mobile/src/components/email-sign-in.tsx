import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';
import { TextField } from '@/components/fields';
import { AppText, Button } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const ERRORS: Record<string, MessageKey> = {
  INVALID_EMAIL_OR_PASSWORD: 'authInvalid',
  EMAIL_NOT_VERIFIED: 'authNotVerified',
  USER_ALREADY_EXISTS: 'authExists',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'authExists',
  PASSWORD_TOO_SHORT: 'authShort',
  INVALID_EMAIL: 'authEmail',
};

/**
 * Entrar ou criar conta com e-mail e senha (como no site). Criar conta manda o link de
 * confirmação por e-mail; depois de confirmar, é só entrar aqui. "Esqueci a senha" abre o site.
 */
export function EmailSignIn() {
  const colors = useColors();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async () => {
    setPending(true);
    setError('');
    setInfo('');
    try {
      const result =
        mode === 'signIn'
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              callbackURL: '/painel',
            });
      if (result.error) {
        const key = ERRORS[result.error.code ?? ''];
        setError(
          key ? t(key) : result.error.status === 429 ? t('authRateLimited') : t('signInError'),
        );
        return;
      }
      if (mode === 'signUp') {
        setInfo(t('authCheckInbox', { email: email.trim() }));
        setMode('signIn');
        setPassword('');
      }
      // Entrou: a sessão muda e o app vai sozinho para a área logada.
    } catch {
      setError(t('serverUnreachable', { url: API_URL }));
    } finally {
      setPending(false);
    }
  };

  const valid =
    email.includes('@') && password.length >= 8 && (mode === 'signIn' || name.trim().length >= 2);

  return (
    <View style={{ gap: 12, alignSelf: 'stretch', maxWidth: 360, width: '100%' }}>
      {mode === 'signUp' && (
        <TextField label={t('authName')} value={name} onChangeText={setName} autoComplete="name" />
      )}
      <TextField
        label={t('authEmailLabel')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label={t('authPassword')}
        hint={mode === 'signUp' ? t('authPasswordHint') : undefined}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
        textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
      />
      <Button
        label={
          pending
            ? t('signingIn')
            : mode === 'signIn'
              ? t('authSignInEmail')
              : t('authCreateAccount')
        }
        disabled={pending || !valid}
        onPress={() => void submit()}
      />
      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger, textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
      {info ? (
        <AppText accessibilityRole="alert" style={{ color: colors.success, textAlign: 'center' }}>
          {info}
        </AppText>
      ) : null}
      <Button
        label={mode === 'signIn' ? t('authNoAccount') : t('authHasAccount')}
        variant="secondary"
        onPress={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setError('');
        }}
      />
      {mode === 'signIn' && (
        <Button
          label={t('authForgot')}
          variant="secondary"
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/esqueci-senha`)}
        />
      )}
    </View>
  );
}
