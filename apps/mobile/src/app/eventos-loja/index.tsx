import { ApiError } from '@boramarcar/api-client';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useAsync, useRefreshOnFocus } from '@/lib/use-async';

const STATUS: Record<string, MessageKey> = {
  registered: 'storeEvRegistered',
  waitlist: 'storeEvWaitlisted',
};

/** Eventos de loja (10.2c): os meus próximos e o código do balcão. */
export default function MyStoreEventsScreen() {
  const mine = useAsync(() => api.storeEvents.mine(), []);
  useRefreshOnFocus(mine.refresh);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const entry = await api.storeEvents.byCode(code);
      setCode('');
      router.push({ pathname: '/eventos-loja/[id]', params: { id: entry.eventId } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };

  if (mine.loading) return <Loading />;
  if (mine.error) return <ErrorState error={mine.error} onRetry={mine.refresh} />;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={mine.refreshing} onRefresh={mine.refresh} />}
    >
      <AppText accessibilityRole="header" style={styles.title}>
        {t('storeEvTitle')}
      </AppText>
      <Card style={{ gap: 10 }}>
        <AppText accessibilityRole="header" style={styles.sectionTitle}>
          {t('storeEvCodeTitle')}
        </AppText>
        <AppText muted>{t('storeEvCodeIntro')}</AppText>
        <TextField
          label={t('storeEvCodeLabel')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <Button
          label={t('storeEvCodeSubmit')}
          disabled={busy || code.trim().length < 6}
          onPress={() => void join()}
        />
      </Card>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>
        {t('storeEvMine')}
      </AppText>
      {(mine.data ?? []).length === 0 ? (
        <AppText muted>{t('storeEvMineEmpty')}</AppText>
      ) : (
        (mine.data ?? []).map((m) => (
          <Pressable
            key={m.entryId}
            accessibilityRole="button"
            accessibilityLabel={`${m.event.title}, ${m.store.name}. ${formatDateTime(m.event.startsAt)}. ${t(STATUS[m.status] ?? 'storeEvRegistered')}`}
            onPress={() =>
              router.push({ pathname: '/eventos-loja/[id]', params: { id: m.event.id } })
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Card style={{ gap: 2 }}>
              <AppText style={{ fontWeight: '700' }}>{m.event.title}</AppText>
              <AppText muted>
                {m.store.name} · {formatLabel(m.event.format)}
              </AppText>
              <AppText muted>{formatDateTime(m.event.startsAt)}</AppText>
              <AppText>{t(STATUS[m.status] ?? 'storeEvRegistered')}</AppText>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
