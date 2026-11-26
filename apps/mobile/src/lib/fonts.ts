import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';

/**
 * Fonte de display da marca (títulos), a mesma Fraunces do site e do logotipo (SIL OFL 1.1),
 * empacotada no app (nada é baixado em uso). O peso vem do arquivo: no Android, `fontWeight` com
 * uma fonte própria faz o sistema trocar de fonte.
 */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
} as const;

/** Carrega as fontes da marca; com erro, o app segue com a fonte do sistema. */
export function useBrandFonts() {
  const [loaded, error] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  return loaded || Boolean(error);
}
