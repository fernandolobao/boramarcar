import { ApiError } from '@boramarcar/api-client';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

const WEEK = 7 * 24 * 3600_000;

/**
 * "Quem anda sumido" (como no site, só dono e admins): presença nos últimos encontros, última
 * partida e "Chamar" para o próximo encontro (um aviso por pessoa).
 */
export function AttendanceCard({ groupId, viewerId }: { groupId: string; viewerId: string }) {
  const colors = useColors();
  const attendance = useAsync(() => api.groups.attendance(groupId), [groupId]);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  if (attendance.loading) return <Loading />;
  if (attendance.error || !attendance.data) return null;
  const { members, nextEvent, nudged, confirmedNext } = attendance.data;

  const nudge = async (userId: string, name: string) => {
    if (!nextEvent) return;
    setSending(userId);
    setMessage('');
    try {
      await api.groups.nudge(groupId, userId, nextEvent.id);
      attendance.setData({ ...attendance.data!, nudged: [...nudged, userId] });
      setMessage(t('attendanceSent', { name }));
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setSending(null);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('attendanceTitle')}
      </AppText>
      <AppText muted>{t('attendanceHint')}</AppText>
      <AppText muted>
        {nextEvent
          ? t('attendanceNext', {
              title: nextEvent.title,
              when: formatDateTime(nextEvent.startsAt),
            })
          : t('attendanceNoNext')}
      </AppText>
      {members.map((m, i) => {
        const weeks = m.awaySince
          ? Math.max(1, Math.floor((Date.now() - m.awaySince.getTime()) / WEEK))
          : 0;
        const done = nudged.includes(m.userId);
        return (
          <View
            key={m.userId}
            style={{
              gap: 4,
              paddingTop: i ? 10 : 0,
              borderTopWidth: i ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText style={{ fontWeight: '700' }}>{m.name}</AppText>
            {m.awaySince && (
              <AppText style={{ color: colors.danger }}>
                {weeks === 1 ? t('attendanceAwayOne') : t('attendanceAway', { weeks })}
              </AppText>
            )}
            <AppText muted>
              {t('attendanceAttended', { attended: m.attended, of: m.of })} ·{' '}
              {m.lastGameAt
                ? t('attendanceLastGame', { date: formatDate(m.lastGameAt) })
                : t('attendanceNever')}
            </AppText>
            {nextEvent && m.userId !== viewerId && !confirmedNext.includes(m.userId) && (
              <Button
                label={done ? t('attendanceNudged') : t('attendanceNudge')}
                accessibilityLabel={
                  done
                    ? t('attendanceNudgedLabel', { name: m.name })
                    : t('attendanceNudgeLabel', { name: m.name })
                }
                variant="secondary"
                disabled={done || sending !== null}
                onPress={() => void nudge(m.userId, m.name)}
                style={{ alignSelf: 'flex-start' }}
              />
            )}
          </View>
        );
      })}
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </Card>
  );
}
