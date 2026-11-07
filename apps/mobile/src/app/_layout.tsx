import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authClient } from '@/lib/auth';
import { GroupProvider } from '@/lib/group';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { Loading } from '@/components/ui';

/** Raiz: sessão do Better Auth; sem sessão só a tela de entrada fica acessível. */
export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const colors = useColors();
  if (isPending) return <Loading />;
  const signedIn = Boolean(session);
  const content = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('appName') }} />
        <Stack.Screen name="encontros/[id]" options={{ title: t('tabEvents') }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
  return (
    <>
      <StatusBar style="auto" />
      {signedIn ? <GroupProvider>{content}</GroupProvider> : content}
    </>
  );
}
