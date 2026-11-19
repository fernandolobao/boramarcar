import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AccountPrivacy } from '@/components/account-privacy';
import { PushSetting } from '@/components/push-setting';
import { AppText, Button, Card, styles } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useGroup } from '@/lib/group';
import { t } from '@/lib/i18n';
import { disablePush } from '@/lib/push';
import { Choices } from '@/components/ds/choices';

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
        <View style={{ gap: 8 }}>
          <AppText accessibilityRole="header" style={styles.title}>
            {t('activeGroup')}
          </AppText>
          <Choices
            label={t('activeGroup')}
            hideLabel
            orientation="vertical"
            value={group?.id ?? null}
            onChange={(id) => void select(id)}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
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
      {/* Eventos de loja (10.2c): os meus e o código do balcão. */}
      <Button
        label={t('storeEvTitle')}
        variant="secondary"
        onPress={() => router.push('/eventos-loja')}
      />
      <Button
        label={t('groupsManage')}
        variant="secondary"
        onPress={() => router.push('/grupos')}
      />
      <Button
        label={t('settingsTitle')}
        variant="secondary"
        onPress={() => router.push('/configuracoes')}
      />
      <PushSetting />
      <Button label={t('helpTitle')} variant="secondary" onPress={() => router.push('/ajuda')} />
      <Button
        label={t('guideAgain')}
        variant="secondary"
        onPress={() => router.push('/boas-vindas')}
      />
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
