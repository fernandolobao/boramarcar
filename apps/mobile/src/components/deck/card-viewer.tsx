import type { DeckLine } from '@boramarcar/api-client';
import { useState } from 'react';
import { Image, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, styles } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/** Proporção das cartas de Magic (63 × 88 mm). */
const CARD_RATIO = 63 / 88;

/** Carta em tela cheia: imagem grande, verso (cartas de duas faces), edição e texto. */
export function CardViewer({ line, onClose }: { line: DeckLine | null; onClose: () => void }) {
  const colors = useColors();
  const [back, setBack] = useState(false);
  const card = line?.card ?? null;
  const image = back ? card?.backImageUri : card?.imageUri;
  const name = back && card?.backName ? card.backName : (card?.name ?? line?.name ?? '');

  return (
    <Modal
      visible={line !== null}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setBack(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'stretch' }}>
          <AppText accessibilityRole="header" style={styles.title}>
            {name}
          </AppText>
          {image ? (
            <Image
              source={{ uri: image }}
              accessibilityLabel={name}
              resizeMode="contain"
              style={{ width: '100%', aspectRatio: CARD_RATIO, borderRadius: 16 }}
            />
          ) : (
            <AppText muted>{t('deckNoImage')}</AppText>
          )}
          {card?.backImageUri && (
            <Button
              label={back ? t('deckFront') : t('deckBack')}
              variant="secondary"
              onPress={() => setBack((b) => !b)}
            />
          )}
          {card && (
            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '600' }}>{card.typeLine}</AppText>
              {card.setName && (
                <AppText muted>
                  {t('deckSet', {
                    set: card.setName,
                    code: (card.setCode ?? '').toUpperCase(),
                    number: card.collectorNumber ?? '',
                  })}
                </AppText>
              )}
              {card.oracleText ? <AppText>{card.oracleText}</AppText> : null}
            </View>
          )}
          <Button label={t('deckClose')} onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
