import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, ErrorState, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, t } from '@/lib/i18n';
import { useAsync } from '@/lib/use-async';

/** Perfil da loja (10.1, no app): dados, contatos, formatos e os próximos eventos. */
export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const view = useAsync(() => api.stores.get(slug), [slug]);
  if (view.loading) return <Loading />;
  if (view.error || !view.data) return <ErrorState error={view.error} onRetry={view.refresh} />;
  const { store, upcoming } = view.data;
  const open = (url: string) => void Linking.openURL(url);
  const contacts = [
    store.instagram && {
      label: `${t('storeInstagram')}: @${store.instagram}`,
      url: `https://www.instagram.com/${store.instagram}/`,
    },
    store.whatsapp && { label: t('storeWhatsapp'), url: `https://wa.me/${store.whatsapp}` },
    store.website && { label: t('storeWebsite'), url: store.website },
    store.address && {
      label: t('storeDirections'),
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        store.lat !== null && store.lng !== null ? `${store.lat},${store.lng}` : store.address,
      )}`,
    },
  ].filter((c): c is { label: string; url: string } => Boolean(c));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />}
    >
      <Stack.Screen options={{ title: store.name }} />
      <View style={{ gap: 4 }}>
        <AppText accessibilityRole="header" style={styles.title}>
          {store.name}
        </AppText>
        <AppText muted>{store.city}</AppText>
        {store.verified && <AppText style={{ fontWeight: '700' }}>✓ {t('storeVerified')}</AppText>}
      </View>
      {store.about ? (
        <Card style={{ gap: 6 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('storeAbout')}
          </AppText>
          <AppText>{store.about}</AppText>
        </Card>
      ) : null}
      {store.address || store.hours ? (
        <Card style={{ gap: 6 }}>
          {store.address ? <AppText>{store.address}</AppText> : null}
          {store.hours ? (
            <AppText>
              {t('storeHours')}: {store.hours}
            </AppText>
          ) : null}
        </Card>
      ) : null}
      {contacts.length > 0 && (
        <View style={{ gap: 8 }}>
          {contacts.map((c) => (
            <Button
              key={c.url}
              label={c.label}
              variant="secondary"
              accessibilityHint={t('storeOpensOutside')}
              onPress={() => open(c.url)}
              style={{ alignSelf: 'flex-start' }}
            />
          ))}
        </View>
      )}
      {store.formats.length > 0 && (
        <AppText muted>
          {t('storeFormats')}: {store.formats.map(formatLabel).join(', ')}
        </AppText>
      )}
      <AppText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 17 }}>
        {t('storeEvUpcoming')}
      </AppText>
      {upcoming.length === 0 ? (
        <AppText muted>{t('storeEvNone')}</AppText>
      ) : (
        upcoming.map((ev) => (
          <Pressable
            key={ev.id}
            accessibilityRole="button"
            accessibilityLabel={`${ev.title}. ${formatDateTime(ev.startsAt)}. ${formatLabel(ev.format)}`}
            onPress={() => router.push({ pathname: '/eventos-loja/[id]', params: { id: ev.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Card style={{ gap: 2 }}>
              <AppText style={{ fontWeight: '700' }}>{ev.title}</AppText>
              <AppText muted>
                {formatDateTime(ev.startsAt)} · {formatLabel(ev.format)}
              </AppText>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
