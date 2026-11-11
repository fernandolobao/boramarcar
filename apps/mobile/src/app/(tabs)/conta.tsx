import { ScrollView, View } from 'react-native';
import { AccountPrivacy } from '@/components/account-privacy';
import { AppText, Button, Card, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';

/** Conta: quem está conectado, grupo ativo, sair e privacidade (LGPD). */
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
      <Button label={t('signOut')} variant="secondary" onPress={() => void authClient.signOut()} />
      <AccountPrivacy />
    </ScrollView>
  );
}
