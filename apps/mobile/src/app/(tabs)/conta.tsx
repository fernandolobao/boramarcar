import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AccountPrivacy } from '@/components/account-privacy';
import { PushSetting } from '@/components/push-setting';
import { AppText, Button, Card, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { disablePush } from '@/lib/push';

/** Conta: quem está conectado, grupo ativo, avisos neste celular, sair e privacidade (LGPD). */
export default function AccountScreen() {
  const { data: session } = authClient.useSession();
  const { groups, group, select } = useGroup();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <AppText muted>{t('signedInAs')}</AppText>
        <AppText style={{ fontWeight: '700' }}>{session?.user.name}</AppText>
        <AppText muted>{session?.user.email}</AppText>
      </Card>
      {groups.length > 0 && (
        <View
          style={{ gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('activeGroup')}
        >
          <AppText accessibilityRole="header" style={styles.title}>
            {t('activeGroup')}
          </AppText>
          {groups.map((g) => (
            <Button
              key={g.id}
              label={g.name}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: g.id === group?.id }}
              selected={g.id === group?.id}
              onPress={() => void select(g.id)}
            />
          ))}
        </View>
      )}
      {session?.user.id && (
        <Button
          label={t('profileMine')}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/jogadores/[id]', params: { id: session.user.id } })
          }
        />
      )}
      {group && (
        <Button label={t('groupOpen')} variant="secondary" onPress={() => router.push('/grupo')} />
      )}
      <Button
        label={t('groupsManage')}
        variant="secondary"
        onPress={() => router.push('/grupos')}
      />
      <PushSetting />
      <Button
        label={t('feedbackTitle')}
        variant="secondary"
        onPress={() => router.push('/feedback')}
      />
      <Button
        label={t('signOut')}
        variant="secondary"
        // Sair desliga os avisos deste celular (o próximo a entrar liga de novo, se quiser).
        onPress={() => void disablePush().finally(() => void authClient.signOut())}
      />
      <AccountPrivacy />
    </ScrollView>
  );
}
