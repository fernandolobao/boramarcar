import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Notificações push (5.5): encontro novo, alterado ou cancelado, lembrete e "a mesa fechou!".
 * O servidor manda pelo Expo Push para os tokens registrados (`/api/v1/me/push-tokens`).
 *
 * - O pedido de permissão só aparece quando a pessoa liga "Avisos neste celular" na Conta
 *   (nada de pedir ao abrir o app). A escolha fica guardada no aparelho.
 * - Push remoto exige build próprio (EAS); no Expo Go do Android não funciona.
 * - Tocar no aviso abre a tela dele (`data.url`, ex.: `/encontros/123`).
 */
const ENABLED_KEY = 'arcanakin.push-enabled';
const CHANNEL = 'default';

export type PushState = 'on' | 'off' | 'denied' | 'unavailable';

// Com o app aberto, o aviso aparece como banner (e na central), sem som nem número no ícone.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  Constants.easConfig?.projectId;

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // No Android 13+, o pedido de permissão só aparece depois que existe um canal.
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'ArcanaKin',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

const granted = (p: Notifications.NotificationPermissionsStatus) =>
  p.granted ||
  p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  p.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

/** Token do Expo deste aparelho, ou null (sem projeto EAS, sem suporte ou sem permissão). */
async function deviceToken(): Promise<string | null> {
  const id = projectId();
  if (!id || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch {
    return null;
  }
}

const platform = () => (Platform.OS === 'ios' ? 'ios' : 'android');

/** Estado atual dos avisos neste aparelho (sem pedir nada). */
export async function getPushState(): Promise<PushState> {
  if (!projectId()) return 'unavailable';
  const wanted = (await SecureStore.getItemAsync(ENABLED_KEY)) === '1';
  const permission = await Notifications.getPermissionsAsync();
  if (wanted && !granted(permission)) return 'denied';
  return wanted ? 'on' : 'off';
}

/** Liga os avisos: pede permissão (se preciso) e registra o token no servidor. */
export async function enablePush(): Promise<PushState> {
  if (!projectId()) return 'unavailable';
  await ensureChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!granted(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!granted(permission)) return 'denied';
  const token = await deviceToken();
  if (!token) return 'unavailable';
  await api.me.registerPushToken(token, platform());
  await SecureStore.setItemAsync(ENABLED_KEY, '1');
  return 'on';
}

/** Desliga os avisos neste aparelho (também ao sair da conta). */
export async function disablePush(): Promise<PushState> {
  await SecureStore.deleteItemAsync(ENABLED_KEY);
  const token = await deviceToken();
  if (token) await api.me.removePushToken(token).catch(() => undefined);
  return projectId() ? 'off' : 'unavailable';
}

/** Abre a tela de um aviso tocado (só caminhos do próprio app). */
function openFrom(response: Notifications.NotificationResponse | null | undefined) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    router.push(url as never);
  }
}

/**
 * Para a área logada: renova o token (o Expo pode trocá-lo; a data de uso também atualiza) e
 * abre a tela certa quando a pessoa toca num aviso, inclusive com o app fechado.
 */
export function usePushNotifications() {
  useEffect(() => {
    let alive = true;
    void (async () => {
      if ((await getPushState()) !== 'on') return;
      const token = await deviceToken();
      if (alive && token) await api.me.registerPushToken(token, platform()).catch(() => undefined);
    })();
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!alive || !response) return;
      openFrom(response);
      void Notifications.clearLastNotificationResponseAsync();
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(openFrom);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
}
