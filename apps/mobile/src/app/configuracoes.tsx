import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { AppText, Button, Card, ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { deviceTimeZone } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { useAsync } from '@/lib/use-async';

type Locale = 'pt-BR' | 'en';
const LOCALES: readonly Locale[] = ['pt-BR', 'en'];
const LOCALE_LABEL: Record<Locale, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };

/** Configurações (paridade com /configuracoes do site): fuso, idioma e avisos por e-mail. */
export default function SettingsScreen() {
  const colors = useColors();
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
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
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
        <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
          {t('settingsLanguage')}
        </AppText>
        <AppText muted>{t('settingsLanguageHint')}</AppText>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('settingsLanguage')}
        >
          {LOCALES.map((l) => (
            <Button
              key={l}
              label={LOCALE_LABEL[l]}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: locale === l }}
              selected={locale === l}
              onPress={() => setLocale(l)}
            />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText style={{ flex: 1, fontWeight: '700' }}>{t('settingsEmail')}</AppText>
          <Switch
            accessibilityLabel={t('settingsEmail')}
            accessibilityHint={t('settingsEmailHint')}
            value={email}
            onValueChange={setEmail}
            trackColor={{ true: colors.brand, false: colors.border }}
          />
        </View>
        <AppText muted>{t('settingsEmailHint')}</AppText>
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
