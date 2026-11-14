import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TextField } from '@/components/fields';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button, Card, styles } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type Mode = 'url' | 'text';

/** Importar deck (paridade com /decks/importar): link do Archidekt ou lista colada. */
export default function ImportDeckScreen() {
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<GameFormat | 'auto'>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState<string[]>([]);
  const valid = mode === 'url' ? /^https?:\/\//.test(url.trim()) : text.trim().length > 0;

  const submit = async () => {
    setBusy(true);
    setError('');
    setNotFound([]);
    try {
      const chosen = format === 'auto' ? undefined : format;
      const result = await api.decks.import(
        mode === 'url'
          ? { kind: 'url', url: url.trim(), name: name.trim() || undefined, format: chosen }
          : { kind: 'text', text, name: name.trim() || undefined, format: chosen },
      );
      if (result.notFound.length) setNotFound(result.notFound);
      router.replace({ pathname: '/decks/[id]', params: { id: result.deck.id } });
    } catch (e) {
      setError(
        t('deckImportError', { message: e instanceof ApiError ? e.message : t('loadError') }),
      );
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: t('deckImportTitle') }} />
      <AppText accessibilityRole="header" style={styles.title}>
        {t('deckImportTitle')}
      </AppText>
      <Card style={{ gap: 14 }}>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('deckImportMode')}
        >
          {(['url', 'text'] as const).map((m) => (
            <Button
              key={m}
              label={t(m === 'url' ? 'deckImportFromUrl' : 'deckImportFromText')}
              variant="secondary"
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === m }}
              selected={mode === m}
              onPress={() => setMode(m)}
            />
          ))}
        </View>
        {mode === 'url' ? (
          <TextField
            label={t('deckImportUrl')}
            hint={t('deckImportUrlHint')}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        ) : (
          <TextField
            label={t('deckImportList')}
            hint={t('deckImportListHint')}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={8}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ minHeight: 160, paddingTop: 10, textAlignVertical: 'top' }}
          />
        )}
        <TextField
          label={t('deckImportName')}
          hint={t('deckImportNameHint')}
          value={name}
          onChangeText={setName}
          maxLength={120}
        />
        <View style={{ gap: 6 }}>
          <AppText style={{ fontWeight: '600' }}>{t('deckFormat')}</AppText>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('deckFormat')}
          >
            {(['auto', ...GAME_FORMATS] as const).map((f) => (
              <Button
                key={f}
                label={f === 'auto' ? t('deckFormatAuto') : formatLabel(f)}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: format === f }}
                selected={format === f}
                onPress={() => setFormat(f)}
              />
            ))}
          </View>
          <AppText muted>{t('deckFormatHint')}</AppText>
        </View>
        <Button
          label={busy ? t('deckImporting') : t('deckImport')}
          disabled={busy || !valid}
          onPress={() => void submit()}
        />
        {error && (
          <AppText accessibilityRole="alert" style={{ fontWeight: '600' }}>
            {error}
          </AppText>
        )}
        {notFound.length > 0 && (
          <AppText muted accessibilityLiveRegion="polite">
            {t('deckNotFound', { names: notFound.join(', ') })}
          </AppText>
        )}
      </Card>
      <Card style={{ gap: 6 }}>
        <AppText style={{ fontWeight: '700' }}>{t('deckMoxfieldTitle')}</AppText>
        <AppText muted>{t('deckMoxfieldHint')}</AppText>
      </Card>
    </ScrollView>
  );
}
