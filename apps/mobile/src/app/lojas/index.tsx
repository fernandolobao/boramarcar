import type { Discovery, Municipality } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { roundCoord } from '@boramarcar/core/discovery';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { formatDateTime, t, type MessageKey } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { Icon } from '@/components/icons';

const OFFER: Record<string, MessageKey> = {
  singles: 'discOfferSingles',
  sealed: 'discOfferSealed',
  play_space: 'discOfferPlaySpace',
  tournaments: 'discOfferTournaments',
};

/**
 * Lojas e eventos perto de você (10.3): pela cidade do perfil (escolhida aqui, salva no perfil)
 * ou, ao tocar, pela localização do aparelho (arredondada; não é guardada).
 */
export default function DiscoveryScreen() {
  const colors = useColors();
  const [city, setCity] = useState<Municipality | null>(null);
  const [data, setData] = useState<Discovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Municipality[]>([]);
  const [status, setStatus] = useState('');

  const load = async (origin: { city: string } | { lat: number; lng: number }) => {
    setLoading(true);
    try {
      setData(await api.discovery.near(origin));
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const prefs = await api.me.preferences().catch(() => null);
      const saved = prefs?.city ?? null;
      setCity(saved);
      if (saved) await load({ city: `${saved.uf.toLowerCase()}/${saved.slug}` });
      else setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setOptions([]);
    const timer = setTimeout(() => {
      void api.municipalities.search(q).then(setOptions, () => setOptions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = async (c: Municipality) => {
    setCity(c);
    setQuery('');
    setOptions([]);
    setStatus('');
    // O app sempre tem conta: a cidade escolhida fica no perfil.
    void api.me.setCity(c.code).catch(() => undefined);
    await load({ city: `${c.uf.toLowerCase()}/${c.slug}` });
  };

  const useLocation = async () => {
    setStatus(t('discLocating'));
    const { status: permission } = await Location.requestForegroundPermissionsAsync();
    if (permission !== 'granted') return setStatus(t('discLocationError'));
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await load({ lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) });
      setStatus(t('discLocated'));
    } catch {
      setStatus(t('discLocationError'));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <AppText accessibilityRole="header" style={styles.title}>
        {city ? t('discTitleCity', { city: `${city.name}, ${city.uf}` }) : t('discTitle')}
      </AppText>
      <Card style={{ gap: 8 }}>
        <TextField
          label={t('discCityLabel')}
          hint={t('discCityHint')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {options.map((c) => (
          <Button
            key={c.code}
            label={`${c.name}, ${c.uf}`}
            variant="secondary"
            onPress={() => void choose(c)}
          />
        ))}
        <Button
          label={t('discUseLocation')}
          variant="secondary"
          onPress={() => void useLocation()}
        />
        {status ? <AppText accessibilityLiveRegion="polite">{status}</AppText> : null}
      </Card>

      {loading ? (
        <Loading />
      ) : !data ? (
        <AppText muted>{t('discPickCity')}</AppText>
      ) : (
        <>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {t('discEvents')}
          </AppText>
          {data.events.length === 0 ? (
            <AppText muted>{t('discNoEvents')}</AppText>
          ) : (
            data.events.map((e) => (
              <Card key={e.id} style={{ gap: 6 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${e.title}. ${formatDateTime(e.startsAt)}. ${e.store.name}, ${t('discKm', { km: e.distanceKm })}`}
                  onPress={() =>
                    router.push({ pathname: '/eventos-loja/[id]', params: { id: e.id } })
                  }
                >
                  <AppText muted>{formatDateTime(e.startsAt)}</AppText>
                  <AppText style={{ fontWeight: '700' }}>{e.title}</AppText>
                  <AppText muted>
                    {e.store.name} · {t('discKm', { km: e.distanceKm })} · {formatLabel(e.format)}
                  </AppText>
                  <AppText>
                    {e.capacity
                      ? t('storeEvSpots', { registered: e.registered, capacity: e.capacity })
                      : t('storeEvSpotsOpen', { registered: e.registered })}
                  </AppText>
                </Pressable>
                <Button
                  label={t('discAddToCalendar')}
                  variant="secondary"
                  accessibilityLabel={`${t('discAddToCalendar')} (${e.title})`}
                  accessibilityHint={t('storeOpensOutside')}
                  onPress={() => void Linking.openURL(`${API_URL}/api/v1/store-events/${e.id}/ics`)}
                />
              </Card>
            ))
          )}

          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {t('discStores')}
          </AppText>
          {data.stores.length === 0 ? (
            <AppText muted>{t('discNoStores')}</AppText>
          ) : (
            data.stores.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${s.municipality.name}. ${t('discKm', { km: s.distanceKm })}`}
                onPress={() => router.push({ pathname: '/lojas/[slug]', params: { slug: s.slug } })}
              >
                <Card style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <AppText style={{ fontWeight: '700' }}>{s.name}</AppText>
                    {s.verified ? <Icon name="done" color={colors.text} /> : null}
                  </View>
                  <AppText muted>
                    {s.municipality.name}, {s.municipality.uf} · {t('discKm', { km: s.distanceKm })}
                  </AppText>
                  {s.offers.length > 0 && (
                    <AppText>
                      {s.offers
                        .filter((o) => OFFER[o])
                        .map((o) => t(OFFER[o]!))
                        .join(' · ')}
                    </AppText>
                  )}
                </Card>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
