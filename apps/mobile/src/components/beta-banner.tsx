import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { useColors } from '@/lib/theme';

/**
 * Faixa "Seu grupo está no beta" (8.5), como no painel do site: semana atual e atalho do
 * feedback. Some fora do beta; "Dispensar" vale no site e no app (guardado no servidor).
 */
export function BetaBanner({ groupId }: { groupId: string }) {
  const colors = useColors();
  const beta = useAsync(() => api.groups.beta(groupId).catch(() => null), [groupId]);
  const [hidden, setHidden] = useState(false);
  if (hidden || !beta.data) return null;
  const { week, weeks, endsAt } = beta.data;
  return (
    <Card style={{ gap: 8, borderColor: colors.brand }}>
      <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('betaTitle')}
      </AppText>
      <AppText muted>{t('betaBody', { week, weeks, until: formatDate(endsAt) })}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label={t('feedbackTitle')} onPress={() => router.push('/feedback')} />
        <Button
          label={t('betaDismiss')}
          variant="secondary"
          accessibilityLabel={t('betaDismissLabel')}
          onPress={() => {
            setHidden(true);
            void api.me.markOnboarding('beta-banner-dismissed').catch(() => {});
          }}
        />
      </View>
    </Card>
  );
}
