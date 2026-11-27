import { CHALLENGES, LEARN, type LearnLocale } from '@boramarcar/core/learn';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { AppText } from '@/components/ui';
import { api } from '@/lib/api';
import { locale } from '@/lib/i18n';

/** Conteúdo da trilha no idioma do app (o mesmo do site, vindo do núcleo). */
export const learnLocale: LearnLocale = locale === 'en' ? 'en' : 'pt-BR';
export const learnContent = LEARN[learnLocale];
export { CHALLENGES };

/** Lições e desafios concluídos (servidor). Enquanto carrega ou sem rede, nenhum. */
export function useLearnProgress() {
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void api.me
      .learnProgress()
      .then((ids) => alive && setDone(ids))
      .catch(() => undefined)
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  /** Marca (ou desmarca) um item e guarda a lista que o servidor devolve. */
  const mark = async (id: string, completed: boolean) => {
    const ids = await api.me.setLessonCompleted(id, completed);
    setDone(ids);
    return ids;
  };
  return { done, loaded, mark };
}

/** Cartas de exemplo (imagem pelo nome; sem imagem, o nome). Decorativas: o nome vai no texto. */
export function ExampleCards({ names }: { names: readonly string[] }) {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const key = names.join('|');
  useEffect(() => {
    let alive = true;
    void Promise.all(
      key.split('|').map(async (name) => [name, (await api.cards.named(name))?.imageUri ?? null]),
    ).then((pairs) => alive && setImages(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [key]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {names.map((name) => (
        <View key={name} style={{ width: 120, gap: 4 }}>
          {images[name] ? (
            <Image
              source={{ uri: images[name]! }}
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ width: 120, aspectRatio: 488 / 680, borderRadius: 6 }}
            />
          ) : null}
          <AppText muted style={{ fontSize: 13 }}>
            {name}
          </AppText>
        </View>
      ))}
    </View>
  );
}
