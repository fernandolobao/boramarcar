import type { NotificationItem } from '@boramarcar/api-client';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppText, ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

/** Texto da notificação no idioma do aparelho. */
function notificationText(item: NotificationItem) {
  const d = item.data as Record<string, unknown> & { kind: string };
  const name = (id: string) => item.people[id] ?? t('notifSomeone');
  const names = (ids: unknown) => (Array.isArray(ids) ? ids.map((id) => name(String(id))) : []);
  const event = item.eventTitle ?? '';
  switch (d.kind) {
    case 'game': {
      const winners = names(d.winnerIds);
      if (d.result === 'win') return t('notifGameWin', { event });
      if (!winners.length) return t('notifGameDraw', { event });
      return t(winners.length === 1 ? 'notifGameLossOne' : 'notifGameLossMany', {
        event,
        winners: winners.join(t('notifAnd')),
      });
    }
    case 'group_game': {
      const winners = names(d.winnerIds);
      if (!winners.length) return t('notifGroupGameDraw', { event });
      return t(winners.length === 1 ? 'notifGroupGameOne' : 'notifGroupGameMany', {
        event,
        winners: winners.join(t('notifAnd')),
      });
    }
    case 'nudge':
      return t('notifNudge', { event, group: item.groupName ?? '' });
    case 'achievement':
      return t('notifAchievement', {
        name: t(`achievement_${String(d.achievementId)}_name` as MessageKey),
      });
    case 'podium':
      return t('notifPodium', {
        group: item.groupName ?? '',
        podium: names(d.userIds)
          .map((n, i) => `${i + 1}º ${n}`)
          .join(', '),
      });
    default:
      return item.announcement?.title ?? t('notifAnnouncement');
  }
}

/** Para onde a notificação leva (no app). */
function open(item: NotificationItem) {
  const d = item.data as Record<string, unknown>;
  if (
    (item.kind === 'game' || item.kind === 'group_game' || item.kind === 'nudge') &&
    typeof d.eventId === 'string'
  ) {
    router.push({ pathname: '/encontros/[id]', params: { id: d.eventId } });
  } else if (item.kind === 'podium') {
    router.push('/ranking');
  }
}

/** Central de notificações: ao abrir, tudo passa a contar como lido. */
export default function NotificationsScreen() {
  const colors = useColors();
  const inbox = useAsync(() => api.me.notifications(), []);
  const unread = inbox.data?.unread ?? 0;

  useEffect(() => {
    if (unread > 0) api.me.markNotificationsRead().catch(() => {});
  }, [unread]);

  if (inbox.loading) return <Loading />;
  if (inbox.error || !inbox.data) return <ErrorState error={inbox.error} onRetry={inbox.refresh} />;
  const items = inbox.data.items;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={<RefreshControl refreshing={inbox.refreshing} onRefresh={inbox.refresh} />}
    >
      {items.length === 0 ? (
        <AppText muted>{t('notifEmpty')}</AppText>
      ) : (
        items.map((item) => {
          const text = notificationText(item);
          const isNew = !item.readAt;
          const meta = [
            item.kind !== 'podium' ? item.groupName : null,
            formatDateTime(item.createdAt),
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={item.id}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${isNew ? `${t('notifNew')}. ` : ''}${text}. ${
                item.announcement ? `${item.announcement.body} ` : ''
              }${meta}`}
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: isNew ? colors.accent : colors.border,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={item.announcement ? { fontWeight: '700' } : undefined}>
                  {text}
                </AppText>
                {item.announcement ? <AppText>{item.announcement.body}</AppText> : null}
                <AppText muted>{meta}</AppText>
              </View>
              {isNew ? (
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: colors.accent,
                  }}
                >
                  <AppText style={{ color: colors.onAccent, fontWeight: '700', fontSize: 12 }}>
                    {t('notifNew')}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
