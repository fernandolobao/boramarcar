import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Logo } from '@/components/logo';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons
      name={name}
      color={typeof color === 'number' ? undefined : (color ?? undefined)}
      size={size}
      accessibilityElementsHidden
    />
  );

/** Abas principais (5.4): encontros, disponibilidade, ranking, decks e conta. */
export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
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
        name="index"
        options={{
          title: t('tabEvents'),
          tabBarIcon: icon('calendar-month'),
          // Na aba inicial, o cabeçalho mostra o logotipo (a tela tem o próprio título).
          headerTitle: () => <Logo height={20} />,
        }}
      />
      <Tabs.Screen
        name="disponibilidade"
        options={{ title: t('tabAvailability'), tabBarIcon: icon('clock-outline') }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ title: t('tabRanking'), tabBarIcon: icon('trophy') }}
      />
      <Tabs.Screen
        name="decks"
        options={{ title: t('tabDecks'), tabBarIcon: icon('cards-outline') }}
      />
      <Tabs.Screen
        name="conta"
        options={{ title: t('tabAccount'), tabBarIcon: icon('account-circle') }}
      />
    </Tabs>
  );
}
