import { ApiError } from '@boramarcar/api-client';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { AppText, Button, Card, Loading, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { savePendingInvite, useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Sem login: guarda o convite e vai para a entrada; o grupo é aberto logo depois do login. */
function SaveAndSignIn({ code }: { code: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void savePendingInvite(code).finally(() => setSaved(true));
  }, [code]);
  return saved ? <Redirect href="/entrar" /> : <Loading />;
}

/** Com login: confirma e entra no grupo do convite. */
function JoinInvite({ code }: { code: string }) {
  const colors = useColors();
  const { join, groups } = useGroup();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await join(code);
      router.replace('/');
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'not_found' ? t('groupJoinNotFound') : t('loadError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText accessibilityRole="header" style={styles.title}>
        {t('inviteTitle')}
      </AppText>
      <Card style={{ gap: 12 }}>
        <AppText>{t('inviteBody', { code })}</AppText>
        <Button
          label={busy ? t('groupJoining') : t('groupJoin')}
          disabled={busy}
          onPress={() => void accept()}
        />
        {groups.length > 0 && (
          <Button
            label={t('inviteLater')}
            variant="secondary"
            onPress={() => router.replace('/')}
          />
        )}
        {error ? (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
      </Card>
    </ScrollView>
  );
}

/**
 * Convite pelo link `arcanakin://convite/CÓDIGO` (o botão "Abrir no app" da página do convite):
 * entra no grupo — na hora, ou logo depois do login.
 */
export default function InviteScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { data: session, isPending } = authClient.useSession();
  const code = (codigo ?? '').trim().toUpperCase();
  if (isPending) return <Loading />;
  if (!session) return <SaveAndSignIn code={code} />;
  return <JoinInvite code={code} />;
}
