import type { NotificationItem } from '@boramarcar/api-client';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppText, Button, ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatMonthYear, t, type MessageKey } from '@/lib/i18n';
import { monthlyRecapUrl } from '@/lib/config';
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
    case 'tournament': {
      const name = item.tournamentName ?? '';
      if (d.event === 'finished') return t('notifTournamentFinished', { name });
      return d.table === null || d.table === undefined
        ? t('notifTournamentBye', { name, round: Number(d.round) })
        : t('notifTournamentRound', { name, round: Number(d.round), table: Number(d.table) });
    }
    case 'monthly':
      return t('notifMonthly', {
        group: item.groupName ?? '',
        month: formatMonthYear(new Date(`${String(d.month)}-15T12:00:00Z`)),
      });
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
  } else if (item.kind === 'tournament' && typeof d.tournamentId === 'string') {
    router.push({ pathname: '/torneios/[id]', params: { id: d.tournamentId } });
  } else if (
    item.kind === 'monthly' &&
    typeof d.groupId === 'string' &&
    typeof d.month === 'string'
  ) {
    // A retrospectiva do mês é uma página do site (a mesma que se compartilha).
    void Linking.openURL(monthlyRecapUrl(d.groupId, d.month));
  }
}

/** Central de notificações: ao abrir, tudo passa a contar como lido. */
export default function NotificationsScreen() {
  const colors = useColors();
  const inbox = useAsync(() => api.me.notifications(), []);
  // Lidas nesta visita (a lista não é recarregada a cada toque).
  const [read, setRead] = useState<Set<string>>(new Set());
  const isUnread = (item: NotificationItem) => !item.readAt && !read.has(item.id);

  const markOne = (item: NotificationItem) => {
    if (!isUnread(item)) return;
    setRead((prev) => new Set(prev).add(item.id));
    api.me.markNotificationRead(item.id).catch(() => {});
  };
  const markAll = () => {
    setRead(new Set(inbox.data?.items.map((i) => i.id) ?? []));
    api.me.markNotificationsRead().catch(() => {});
  };

  if (inbox.loading) return <Loading />;
  if (inbox.error || !inbox.data) return <ErrorState error={inbox.error} onRetry={inbox.refresh} />;
  const items = inbox.data.items;
  const unread = items.filter(isUnread).length;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={<RefreshControl refreshing={inbox.refreshing} onRefresh={inbox.refresh} />}
    >
      {unread > 0 ? (
        <Button
          label={t('notifMarkAll')}
          variant="secondary"
          onPress={markAll}
          style={{ alignSelf: 'flex-start' }}
        />
      ) : null}
      {items.length === 0 ? (
        <AppText muted>{t('notifEmpty')}</AppText>
      ) : (
        items.map((item) => {
          const text = notificationText(item);
          const isNew = isUnread(item);
          const meta = [
            item.kind !== 'podium' ? item.groupName : null,
            formatDateTime(item.createdAt),
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                markOne(item);
                open(item);
              }}
              accessibilityActions={
                isNew ? [{ name: 'markRead', label: t('notifMarkOne') }] : undefined
              }
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'markRead') markOne(item);
              }}
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
                <Pressable
                  onPress={() => markOne(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('notifMarkOne')}: ${text}`}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <AppText style={{ color: colors.brand, fontWeight: '600' }}>
                    {t('notifMarkOne')}
                  </AppText>
                </Pressable>
              ) : null}
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
