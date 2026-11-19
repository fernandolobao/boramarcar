import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { StatusBar } from 'expo-status-bar';
import { authClient } from '@/lib/auth';
import { GroupProvider } from '@/lib/group';
import { t } from '@/lib/i18n';
import { usePushNotifications } from '@/lib/push';
import { useColors } from '@/lib/theme';
import { Loading } from '@/components/ui';
import { initSentry, Sentry } from '@/lib/sentry';

// Erros do app (só com o DSN configurado; ver `lib/sentry.ts`).
initSentry();

/** Na área logada: renova o token de push e abre a tela de um aviso tocado. */
function PushNotifications() {
  usePushNotifications();
  return null;
}

/**
 * Primeiro acesso de conta nova: abre o guia (7.1) uma vez. Sem rede ou com erro, segue sem guia
 * (nunca bloqueia o app).
 */
function GuideLauncher() {
  useEffect(() => {
    api.me
      .onboarding()
      .then((guide) => {
        if (guide.show) router.push('/boas-vindas');
      })
      .catch(() => undefined);
  }, []);
  return null;
}

/** Raiz: sessão do Better Auth; sem sessão só a tela de entrada fica acessível. */
function RootLayout() {
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
        <Stack.Screen name="decks/importar" options={{ title: t('deckImportTitle') }} />
        <Stack.Screen name="colecao" options={{ title: t('collectionTitle') }} />
        <Stack.Screen name="jogadores/[id]" options={{ title: t('profileTitle') }} />
        <Stack.Screen name="feedback" options={{ title: t('feedbackTitle') }} />
        <Stack.Screen name="notificacoes" options={{ title: t('notifTitle') }} />
        <Stack.Screen name="ajuda" options={{ title: t('helpTitle') }} />
        <Stack.Screen name="boas-vindas" options={{ title: t('guideTitle') }} />
        <Stack.Screen name="grupos" options={{ title: t('groupsManage') }} />
        <Stack.Screen name="grupo" options={{ title: t('groupTitle') }} />
        <Stack.Screen name="recordes" options={{ title: t('recordsTitle') }} />
        <Stack.Screen name="torneios/index" options={{ title: t('tourTitle') }} />
        <Stack.Screen name="torneios/novo" options={{ title: t('tourNew') }} />
        <Stack.Screen name="torneios/[id]" options={{ title: t('tourTitle') }} />
        <Stack.Screen name="configuracoes" options={{ title: t('settingsTitle') }} />
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
          <GuideLauncher />
        </GroupProvider>
      ) : (
        content
      )}
    </>
  );
}

export default Sentry.wrap(RootLayout);
