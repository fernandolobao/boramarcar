import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Sino no cabeçalho do painel, com o número de notificações não lidas. */
export function NotificationsBell() {
  const colors = useColors();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api.me
        .notifications()
        .then((r) => setUnread(r.unread))
        .catch(() => {});
    }, []),
  );

  const label =
    unread === 0
      ? t('notifTitle')
      : unread === 1
        ? t('notifBellOne')
        : t('notifBellMany', { count: unread });

  return (
    <Pressable
      onPress={() => router.push('/notificacoes')}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        marginRight: 12,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons
        name="bell-outline"
        size={24}
        color={colors.text}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            alignItems: 'center',
            backgroundColor: colors.accent,
          }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <AppText style={{ color: colors.onAccent, fontSize: 11, fontWeight: '800' }}>
            {unread > 99 ? '99+' : unread}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
