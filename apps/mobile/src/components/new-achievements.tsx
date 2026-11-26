import type { Achievement } from '@boramarcar/api-client';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateMedium, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { Icon } from '@/components/icons';
import { ACHIEVEMENT_ICON } from '@/components/achievement-icons';

/**
 * Janela de conquistas novas (painel e perfil próprio): ao abrir a tela, mostra juntas as
 * conquistas ganhas desde a última vez. Ao fechar ("Legal!" ou voltar do Android), as mostradas
 * contam como vistas. Falhas de rede não mostram nada (tenta de novo na próxima visita).
 */
export function NewAchievements() {
  const colors = useColors();
  const [list, setList] = useState<Achievement[]>([]);
  const loading = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (loading.current) return;
      loading.current = true;
      api.me
        .newAchievements()
        .then(setList)
        .catch(() => {})
        .finally(() => {
          loading.current = false;
        });
    }, []),
  );

  const close = () => {
    const ids = list.map((a) => a.id);
    setList([]);
    api.me.markAchievementsSeen(ids).catch(() => {});
  };

  return (
    <Modal visible={list.length > 0} animationType="fade" transparent onRequestClose={close}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 16,
          backgroundColor: '#00000099',
        }}
      >
        <ScrollView
          style={{ maxHeight: '85%', backgroundColor: colors.background, borderRadius: 20 }}
          contentContainerStyle={{ padding: 20, gap: 14 }}
          accessibilityViewIsModal
        >
          <AppText accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700' }}>
            {list.length === 1
              ? t('newAchievementsTitleOne')
              : t('newAchievementsTitleMany', { count: list.length })}
          </AppText>
          <AppText muted>{t('newAchievementsIntro')}</AppText>
          {list.map((a) => {
            const name = t(`achievement_${a.id}_name` as MessageKey);
            const description = t(`achievement_${a.id}_description` as MessageKey);
            return (
              <View
                key={a.id}
                accessible
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.accent,
                  }}
                >
                  <Icon name={ACHIEVEMENT_ICON[a.id]} size={20} color={colors.onAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: '700' }}>{name}</AppText>
                  <AppText>{description}</AppText>
                  {a.unlockedAt ? (
                    <AppText muted>
                      {t('achievementUnlockedOn', { date: formatDateMedium(a.unlockedAt) })}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
          <Button label={t('newAchievementsClose')} onPress={close} />
        </ScrollView>
      </View>
    </Modal>
  );
}
