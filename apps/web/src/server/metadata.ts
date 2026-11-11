import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type NavKey =
  | 'dashboard'
  | 'availability'
  | 'events'
  | 'ranking'
  | 'decks'
  | 'collection'
  | 'group'
  | 'profile'
  | 'settings';

/** Gera `generateMetadata` com o título traduzido da seção. */
export const navMetadata = (key: NavKey) => async (): Promise<Metadata> => ({
  title: (await getTranslations('nav'))(key),
});
