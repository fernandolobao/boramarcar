import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Logo } from '@/components/logo';
import { NotificationsBell } from '@/components/notifications-bell';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Ícone da aba: o mesmo da navegação do site (Lucide). */
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} size={size} color={typeof color === 'string' ? color : '#888'} />
  );

/** A aba inicial é o painel (as outras continuam acessíveis pela barra e pelos links). */
export const unstable_settings = { anchor: 'painel' };

/** Abas principais (5.4): início (painel), encontros, disponibilidade, ranking, decks e conta. */
export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      // "Voltar" numa aba leva ao painel (a âncora), não à primeira aba da lista.
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="painel"
        options={{
          title: t('tabHome'),
          tabBarIcon: icon('dashboard'),
          // Na aba inicial, o cabeçalho mostra o logotipo (a tela tem o próprio título).
          headerTitle: () => <Logo height={20} />,
          // Sino da central de notificações.
          headerRight: () => <NotificationsBell />,
        }}
      />
      <Tabs.Screen name="index" options={{ title: t('tabEvents'), tabBarIcon: icon('events') }} />
      <Tabs.Screen
        name="disponibilidade"
        options={{ title: t('tabAvailability'), tabBarIcon: icon('availability') }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ title: t('tabRanking'), tabBarIcon: icon('ranking') }}
      />
      <Tabs.Screen name="decks" options={{ title: t('tabDecks'), tabBarIcon: icon('decks') }} />
      <Tabs.Screen name="conta" options={{ title: t('tabAccount'), tabBarIcon: icon('profile') }} />
    </Tabs>
  );
}
