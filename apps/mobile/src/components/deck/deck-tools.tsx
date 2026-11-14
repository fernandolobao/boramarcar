import type { DeckDetail } from '@boramarcar/api-client';
import { ApiError } from '@boramarcar/api-client';
import { GAME_FORMATS, type GameFormat } from '@boramarcar/core/games';
import { DECK_VISIBILITIES, type DeckVisibility } from '@boramarcar/core/decks';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { TextField } from '@/components/fields';
import { StackSection } from '@/components/stack';
import { formatLabel } from '@/components/table/labels';
import { AppText, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { t, type MessageKey } from '@/lib/i18n';

const VISIBILITY_LABEL: Record<DeckVisibility, MessageKey> = {
  private: 'deckVisibilityPrivate',
  group: 'deckVisibilityGroup',
  public: 'deckVisibilityPublic',
};
const VISIBILITY_HINT: Record<DeckVisibility, MessageKey> = {
  private: 'deckVisibilityPrivateHint',
  group: 'deckVisibilityGroupHint',
  public: 'deckVisibilityPublicHint',
};
const isVisibility = (v: string): v is DeckVisibility =>
  (DECK_VISIBILITIES as readonly string[]).includes(v);
const isFormat = (v: string): v is GameFormat => (GAME_FORMATS as readonly string[]).includes(v);

/** Ferramentas do dono (paridade com o site): configurações, atualizar, exportar e excluir. */
export function DeckTools({
  deck,
  index,
  onChanged,
}: {
  deck: DeckDetail;
  index: number;
  onChanged: () => void;
}) {
  const [name, setName] = useState(deck.name);
  const [format, setFormat] = useState<GameFormat>(isFormat(deck.format) ? deck.format : 'other');
  const [visibility, setVisibility] = useState<DeckVisibility>(
    isVisibility(deck.visibility) ? deck.visibility : 'group',
  );
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty =
    name.trim() !== deck.name || format !== deck.format || visibility !== deck.visibility;
  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await action());
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };
  const share = (kind: 'plain' | 'proxies') =>
    void run(async () => {
      const text = await api.decks.exportText(deck.id, kind);
      await Share.share({ message: text, title: deck.name });
      return '';
    });
  const sync = (text?: string) =>
    void run(async () => {
      const r = await api.decks.sync(deck.id, text);
      setPasted('');
      onChanged();
      return t('deckSyncResult', {
        added: r.added.length,
        removed: r.removed.length,
        changed: r.changed.length,
      });
    });

  return (
    <StackSection index={index} title={t('deckTools')}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('deckSettings')}
          </AppText>
          <TextField label={t('deckName')} value={name} onChangeText={setName} maxLength={120} />
          <AppText style={{ fontWeight: '600' }}>{t('deckFormat')}</AppText>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('deckFormat')}
          >
            {GAME_FORMATS.map((f) => (
              <Button
                key={f}
                label={formatLabel(f)}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: format === f }}
                selected={format === f}
                onPress={() => setFormat(f)}
              />
            ))}
          </View>
          <AppText style={{ fontWeight: '600' }}>{t('deckVisibility')}</AppText>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('deckVisibility')}
          >
            {DECK_VISIBILITIES.map((v) => (
              <Button
                key={v}
                label={t(VISIBILITY_LABEL[v])}
                variant="secondary"
                accessibilityRole="radio"
                accessibilityState={{ checked: visibility === v }}
                selected={visibility === v}
                onPress={() => setVisibility(v)}
              />
            ))}
          </View>
          <AppText muted>{t(VISIBILITY_HINT[visibility])}</AppText>
          <Button
            label={busy ? t('settingsSaving') : t('deckSave')}
            disabled={busy || !dirty || !name.trim()}
            onPress={() =>
              void run(async () => {
                await api.decks.update(deck.id, { name: name.trim(), format, visibility });
                onChanged();
                return t('deckSaved');
              })
            }
          />
        </View>

        <View style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('deckSync')}
          </AppText>
          {deck.sourceUrl ? (
            <>
              <AppText muted>{t('deckSyncHint')}</AppText>
              <Button
                label={t('deckSyncRun')}
                variant="secondary"
                disabled={busy}
                onPress={() => sync()}
              />
            </>
          ) : null}
          <TextField
            label={t('deckSyncPaste')}
            hint={t('deckSyncPasteHint')}
            value={pasted}
            onChangeText={setPasted}
            multiline
            numberOfLines={6}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ minHeight: 120, paddingTop: 10, textAlignVertical: 'top' }}
          />
          <Button
            label={t('deckSyncPasteRun')}
            variant="secondary"
            disabled={busy || !pasted.trim()}
            onPress={() => sync(pasted)}
          />
        </View>

        <View style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('deckExport')}
          </AppText>
          <AppText muted>{t('deckExportHint')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label={t('deckExportPlain')}
              variant="secondary"
              disabled={busy}
              onPress={() => share('plain')}
            />
            <Button
              label={t('deckExportProxies')}
              variant="secondary"
              disabled={busy}
              onPress={() => share('proxies')}
            />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <AppText accessibilityRole="header" style={{ fontWeight: '700' }}>
            {t('deckDelete')}
          </AppText>
          <AppText muted>{t('deckDeleteHint')}</AppText>
          <View style={{ alignSelf: 'flex-start' }}>
            <ConfirmButton
              label={t('deckDelete')}
              confirmLabel={t('deckDeleteConfirm')}
              context={deck.name}
              disabled={busy}
              onConfirm={async () => {
                try {
                  await api.decks.remove(deck.id);
                  if (router.canGoBack()) router.back();
                  else router.replace('/decks');
                } catch (e) {
                  setMessage(e instanceof ApiError ? e.message : t('loadError'));
                }
              }}
            />
          </View>
        </View>
        <AppText muted accessibilityLiveRegion="polite">
          {message}
        </AppText>
      </View>
    </StackSection>
  );
}
