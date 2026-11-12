import type { Metadata } from 'next';
import { pageMetadata, type Section } from './seo';

type NavKey =
  | 'dashboard'
  | 'availability'
  | 'events'
  | 'ranking'
  | 'decks'
  | 'collection'
  | 'group'
  | 'profile'
  | 'settings'
  | 'feedback';

/** Seção e caminho de cada item da navegação. */
const NAV: Record<NavKey, { section: Section; path: string }> = {
  dashboard: { section: 'dashboard', path: '/painel' },
  availability: { section: 'availability', path: '/disponibilidade' },
  events: { section: 'events', path: '/eventos' },
  ranking: { section: 'ranking', path: '/ranking' },
  decks: { section: 'decks', path: '/decks' },
  collection: { section: 'collection', path: '/colecao' },
  group: { section: 'group', path: '/grupo' },
  profile: { section: 'profile', path: '/perfil' },
  settings: { section: 'settings', path: '/configuracoes' },
  feedback: { section: 'feedback', path: '/feedback' },
};

/** `generateMetadata` das seções da navegação: título, descrição e prévia de link (`seo.ts`). */
export const navMetadata = (key: NavKey) => (): Promise<Metadata> => pageMetadata(NAV[key]);
