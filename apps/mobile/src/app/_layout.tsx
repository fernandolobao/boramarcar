import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authClient } from '@/lib/auth';
import { GroupProvider } from '@/lib/group';
import { t } from '@/lib/i18n';
import { usePushNotifications } from '@/lib/push';
import { useColors } from '@/lib/theme';
import { Loading } from '@/components/ui';

/** Na área logada: renova o token de push e abre a tela de um aviso tocado. */
function PushNotifications() {
  usePushNotifications();
  return null;
}

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
        <Stack.Screen name="encontros/novo" options={{ title: t('eventNewTitle') }} />
        <Stack.Screen name="encontros/[id]" options={{ title: t('tabEvents') }} />
        <Stack.Screen name="encontros/historico" options={{ title: t('historyTitle') }} />
        <Stack.Screen name="partida/[eventId]" options={{ title: t('gameTitle') }} />
        <Stack.Screen name="mesa/[id]" options={{ title: t('tableTitle') }} />
        <Stack.Screen name="decks/[id]" options={{ title: t('tabDecks') }} />
        <Stack.Screen name="jogadores/[id]" options={{ title: t('profileTitle') }} />
        <Stack.Screen name="feedback" options={{ title: t('feedbackTitle') }} />
        <Stack.Screen name="grupos" options={{ title: t('groupsManage') }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Convite: aberto com ou sem login (sem login, guarda o código e vai para a entrada). */}
      <Stack.Screen name="convite/[codigo]" options={{ title: t('inviteTitle') }} />
    </Stack>
  );
  return (
    <>
      <StatusBar style="auto" />
      {signedIn ? (
        <GroupProvider>
          {content}
          <PushNotifications />
        </GroupProvider>
      ) : (
        content
      )}
    </>
  );
}
