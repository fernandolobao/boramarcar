import { Image, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useColors } from '@/lib/theme';

/** Iniciais do nome ("Ana Teste" → "AT"). */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();

/** Foto da pessoa (ou as iniciais), redonda; decorativa: quem usa diz o nome. */
export function Avatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <AppText style={{ fontSize: Math.round(size / 3), fontWeight: '800' }}>
          {initialsOf(name)}
        </AppText>
      )}
    </View>
  );
}
