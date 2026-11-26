import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { deviceTimeZone } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';
import { Choices } from '@/components/ds/choices';
import { Switch } from '@/components/ds/switch';

type Locale = 'pt-BR' | 'en';
const LOCALES: readonly Locale[] = ['pt-BR', 'en'];
const LOCALE_LABEL: Record<Locale, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };

/** Configurações (paridade com /configuracoes do site): fuso, idioma e avisos por e-mail. */
export default function SettingsScreen() {
  const prefs = useAsync(() => api.me.preferences(), []);
  const [timeZone, setTimeZone] = useState('');
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [email, setEmail] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!prefs.data) return;
    setTimeZone(prefs.data.timeZone);
    setLocale(prefs.data.locale);
    setEmail(prefs.data.emailNotifications);
  }, [prefs.data]);

  if (prefs.loading) return <Loading />;
  if (prefs.error || !prefs.data) return <ErrorState error={prefs.error} onRetry={prefs.refresh} />;
  const device = deviceTimeZone();
  const dirty =
    timeZone !== prefs.data.timeZone ||
    locale !== prefs.data.locale ||
    email !== prefs.data.emailNotifications;

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await api.me.updatePreferences({ timeZone, locale, emailNotifications: email });
      prefs.setData(saved);
      setMessage(t('settingsSaved'));
    } catch {
      setMessage(t('loadError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: t('settingsTitle') }} />
      <AppText muted>{t('settingsIntro')}</AppText>

      <Card style={{ gap: 8 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {t('settingsTimeZone')}
        </AppText>
        <AppText accessibilityLabel={`${t('settingsTimeZone')}: ${timeZone}`}>{timeZone}</AppText>
        <AppText muted>{t('settingsTimeZoneHint')}</AppText>
        {device !== timeZone && (
          <Button
            label={t('settingsUseDevice', { timeZone: device })}
            variant="secondary"
            onPress={() => setTimeZone(device)}
          />
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {t('settingsLanguage')}
        </AppText>
        <AppText muted>{t('settingsLanguageHint')}</AppText>
        <Choices
          label={t('settingsLanguage')}
          hideLabel
          value={locale}
          onChange={setLocale}
          options={LOCALES.map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
        />
      </Card>

      <Card style={{ gap: 8 }}>
        <Switch
          label={t('settingsEmail')}
          description={t('settingsEmailHint')}
          checked={email}
          onChange={setEmail}
        />
      </Card>

      <Button
        label={saving ? t('settingsSaving') : t('settingsSave')}
        disabled={saving || !dirty}
        onPress={() => void save()}
      />
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </ScrollView>
  );
}
