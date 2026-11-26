import { Image, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Proporção das cartas de Magic (63 × 88 mm). */
export const CARD_RATIO = 63 / 88;

/**
 * Carta numa grade (coleção e deck), com os selos no mesmo lugar do site: quantidade no canto de
 * cima à esquerda, proxy à direita e foil embaixo à esquerda. Sem imagem, mostra o nome.
 */
export function CardTile({
  name,
  imageUri,
  quantity,
  proxies = 0,
  foil = false,
  showName = false,
  accessibilityLabel,
  onPress,
}: {
  name: string;
  imageUri: string | null | undefined;
  quantity: number;
  proxies?: number;
  /** Tem cópia foil. */
  foil?: boolean;
  /** Nome embaixo da carta (coleção). */
  showName?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const badge = {
    position: 'absolute' as const,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          aspectRatio: CARD_RATIO,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: colors.surfaceMuted,
          justifyContent: 'center',
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <AppText style={{ textAlign: 'center', fontSize: 12, padding: 6 }} numberOfLines={4}>
            {name}
          </AppText>
        )}
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ ...badge, left: 4, top: 4, backgroundColor: colors.badgeBg }}
        >
          <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.badgeText }}>
            ×{quantity}
          </AppText>
        </View>
        {proxies > 0 && (
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{ ...badge, right: 4, top: 4, backgroundColor: colors.accent }}
          >
            <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.onAccent }}>
              {proxies < quantity ? `${proxies} ${t('deckProxyTag')}` : t('deckProxyTag')}
            </AppText>
          </View>
        )}
        {foil && (
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{ ...badge, left: 6, bottom: '6%', backgroundColor: colors.foilBg }}
          >
            <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.foilText }}>
              ✦ {t('collectionFoil')}
            </AppText>
          </View>
        )}
      </View>
      {showName && (
        <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
          {name}
        </AppText>
      )}
    </Pressable>
  );
}

/** Grade de cartas em 3 colunas (a última linha completa com espaços vazios). */
export function CardGrid<T>({
  items,
  render,
  keyOf,
}: {
  items: readonly T[];
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <View key={row.map(keyOf).join('|')} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((item) => (
            <View key={keyOf(item)} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: 3 - row.length }, (_, i) => (
            <View key={`empty-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
