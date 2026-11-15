import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AddAvailability } from '@/components/availability/add-form';
import { Choices } from '@/components/ds/choices';
import { NoGroup } from '@/components/no-group';
import { AppText, Button, Card, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { deviceTimeZone } from '@/lib/dates';
import { useGroup } from '@/lib/group';
import { formatDateTime, t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

type Locale = 'pt-BR' | 'en';
const LOCALE_LABEL: Record<Locale, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };
const TOTAL = 3;
type Step = 1 | 2 | 3 | 'fim';

/**
 * Guia do primeiro acesso (onboarding 7.1, como no site): seu grupo, fuso e idioma, e quando você
 * pode jogar. Abre sozinho para contas novas; "Pular o guia" em todos os passos; reabre pela Conta.
 */
export default function GuideScreen() {
  const { group, loading } = useGroup();
  const [step, setStep] = useState<Step | null>(null);
  const [busy, setBusy] = useState(false);
  // Quem já está num grupo começa no passo 2.
  useEffect(() => {
    if (!loading && step === null) setStep(group ? 2 : 1);
  }, [loading, group, step]);

  const mark = async (flag: 'guide-skipped' | 'guide-completed') => {
    setBusy(true);
    try {
      await api.me.markOnboarding(flag);
    } catch {
      // Sem rede: segue mesmo assim (o guia nunca prende ninguém).
    } finally {
      setBusy(false);
      router.replace('/painel');
    }
  };

  if (loading || step === null) return <Loading />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {step !== 'fim' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <AppText style={{ fontWeight: '700' }}>
            {t('guideStep', { current: step, total: TOTAL })}
          </AppText>
          <Button
            label={t('guideSkip')}
            variant="secondary"
            disabled={busy}
            onPress={() => void mark('guide-skipped')}
          />
        </View>
      )}
      {step === 1 && <GroupStep onNext={() => setStep(2)} />}
      {step === 2 && <PrefsStep onNext={() => setStep(3)} />}
      {step === 3 && <AvailabilityStep onNext={() => setStep('fim')} />}
      {step === 'fim' && <DoneStep busy={busy} onFinish={() => void mark('guide-completed')} />}
    </ScrollView>
  );
}

function Title({ children }: { children: string }) {
  return (
    <AppText accessibilityRole="header" style={[styles.title, { marginBottom: 0 }]}>
      {children}
    </AppText>
  );
}

function GroupStep({ onNext }: { onNext: () => void }) {
  const { group } = useGroup();
  return (
    <>
      <Title>{t('guideGroupTitle')}</Title>
      <AppText>{t('guideGroupBody')}</AppText>
      {group ? (
        <>
          <AppText style={{ fontWeight: '700' }}>
            {t('guideGroupIn', { group: group.name })}
          </AppText>
          <Button label={t('guideContinue')} onPress={onNext} />
        </>
      ) : (
        <NoGroup onDone={onNext} />
      )}
    </>
  );
}

function PrefsStep({ onNext }: { onNext: () => void }) {
  const prefs = useAsync(() => api.me.preferences(), []);
  const [locale, setLocale] = useState<Locale | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const device = deviceTimeZone();
  if (prefs.loading || !prefs.data) return <Loading />;
  const current = locale ?? prefs.data.locale;

  const saveAndNext = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.me.updatePreferences({
        timeZone: device,
        locale: current,
        emailNotifications: prefs.data!.emailNotifications,
      });
      onNext();
    } catch {
      setMessage(t('loadError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Title>{t('guidePrefsTitle')}</Title>
      <AppText>{t('guidePrefsBody')}</AppText>
      <Card style={{ gap: 8 }}>
        <AppText style={{ fontWeight: '700' }}>{t('settingsTimeZone')}</AppText>
        <AppText accessibilityLabel={`${t('settingsTimeZone')}: ${device}`}>{device}</AppText>
        <AppText muted>{t('settingsTimeZoneHint')}</AppText>
      </Card>
      <Card style={{ gap: 8 }}>
        <Choices
          label={t('settingsLanguage')}
          value={current}
          onChange={setLocale}
          options={(['pt-BR', 'en'] as const).map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
        />
      </Card>
      <Button
        label={saving ? t('settingsSaving') : t('guideContinue')}
        disabled={saving}
        onPress={() => void saveAndNext()}
      />
      <AppText muted accessibilityLiveRegion="polite">
        {message}
      </AppText>
    </>
  );
}

function AvailabilityStep({ onNext }: { onNext: () => void }) {
  const { group } = useGroup();
  const locations = useAsync(
    () => (group ? api.locations.list(group.id) : Promise.resolve([])),
    [group?.id],
  );
  const [saved, setSaved] = useState(false);
  return (
    <>
      <Title>{t('guideAvailabilityTitle')}</Title>
      <AppText>{t('guideAvailabilityBody')}</AppText>
      {!group ? (
        <AppText muted>{t('guideAvailabilityNoGroup')}</AppText>
      ) : locations.loading ? (
        <Loading />
      ) : (
        <AddAvailability
          groupId={group.id}
          locations={locations.data ?? []}
          initialFrequency="weekly"
          onAdded={() => setSaved(true)}
        />
      )}
      <AppText muted accessibilityLiveRegion="polite">
        {saved ? t('guideAvailabilitySaved') : ''}
      </AppText>
      <Button label={t('guideContinue')} onPress={onNext} />
      {!saved && <Button label={t('guideSkipStep')} variant="secondary" onPress={onNext} />}
    </>
  );
}

function DoneStep({ busy, onFinish }: { busy: boolean; onFinish: () => void }) {
  const { group } = useGroup();
  const events = useAsync(
    () => (group ? api.events.list(group.id, 'upcoming') : Promise.resolve([])),
    [group?.id],
  );
  if (events.loading) return <Loading />;
  const next = events.data?.[0];
  return (
    <>
      <Title>{t('guideDoneTitle')}</Title>
      <AppText>
        {!group
          ? t('guideDoneNoGroup')
          : next
            ? t('guideDoneNext', {
                group: group.name,
                title: next.title,
                when: formatDateTime(next.startsAt),
              })
            : t('guideDoneNoEvent', { group: group.name })}
      </AppText>
      <Button label={t('guideFinish')} disabled={busy} onPress={onFinish} />
    </>
  );
}
