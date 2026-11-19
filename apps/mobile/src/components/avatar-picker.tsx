import { ApiError } from '@boramarcar/api-client';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { ConfirmButton } from '@/components/confirm-button';
import { AppText, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Foto do perfil no app: escolher da galeria (já recortada em quadrado pelo seletor do sistema),
 * enviar e trocar; remover em dois toques. O servidor reduz e tira os dados da foto (GPS etc.).
 */
export function AvatarPicker({
  name,
  image,
  onChanged,
}: {
  name: string;
  image: string | null | undefined;
  onChanged: () => void;
}) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const act = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(done);
      onChanged();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : t('loadError'));
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      exif: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const form = new FormData();
    // React Native: o arquivo vai como { uri, name, type }; o `fetch` lê do aparelho.
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? 'foto.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    await act(() => api.me.setAvatar(form), t('avatarSaved'));
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.border,
        }}
      >
        {image ? (
          // Decorativa: o nome está em texto ao lado.
          <Image
            source={{ uri: image }}
            style={{ width: 72, height: 72 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <AppText
            style={{ fontSize: 24, fontWeight: '700' }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {initialsOf(name)}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Button
          label={t(image ? 'avatarChange' : 'avatarChoose')}
          variant="secondary"
          disabled={busy}
          onPress={() => void choose()}
        />
        {image ? (
          <ConfirmButton
            label={t('avatarRemove')}
            confirmLabel={t('avatarRemoveConfirm')}
            context={t('avatarTitle')}
            disabled={busy}
            onConfirm={() => act(() => api.me.removeAvatar(), t('avatarRemoved'))}
          />
        ) : null}
        {message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}
      </View>
    </View>
  );
}
