import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/**
 * Metadados de cada página (título, descrição, prévia de link): Open Graph e Twitter com a
 * imagem da seção (`/og/s/<seção>`) ou uma imagem própria (deck público, convite).
 */
export const SECTIONS = [
  'home',
  'privacy',
  'invite',
  'dashboard',
  'availability',
  'events',
  'event',
  'history',
  'ranking',
  'decks',
  'deck',
  'deckImport',
  'deckPrint',
  'collection',
  'group',
  'profile',
  'player',
  'settings',
  'feedback',
  'table',
  'recap',
  'admin',
] as const;
export type Section = (typeof SECTIONS)[number];
export const isSection = (value: string): value is Section =>
  (SECTIONS as readonly string[]).includes(value);

/** Imagem padrão de cada seção. */
export const sectionImage = (section: Section) => `/og/s/${section}`;

export interface PageMeta {
  section: Section;
  /** Caminho canônico da página (sem domínio). */
  path: string;
  /** Título específico (ex.: nome do deck); sem ele, o da seção. */
  title?: string;
  description?: string;
  image?: { url: string; alt: string };
  /** Páginas da área logada e de uso pessoal não vão para buscadores. */
  index?: boolean;
}

export async function pageMetadata(meta: PageMeta): Promise<Metadata> {
  const t = await getTranslations('meta');
  const tc = await getTranslations('common');
  const title = meta.title ?? t(`${meta.section}.title`);
  const description = meta.description ?? t(`${meta.section}.description`);
  const image = meta.image ?? { url: sectionImage(meta.section), alt: t(`${meta.section}.title`) };
  const images = [{ url: image.url, width: 1200, height: 630, alt: image.alt }];
  // Na home o título é absoluto (sem o "· ArcanaKin" do modelo).
  const home = meta.section === 'home';
  const fullTitle = home ? title : `${title} · ${tc('appName')}`;
  return {
    title: home ? { absolute: title } : title,
    description,
    alternates: { canonical: meta.path },
    openGraph: {
      siteName: tc('appName'),
      type: 'website',
      locale: t('ogLocale'),
      url: meta.path,
      title: fullTitle,
      description,
      images,
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images },
    robots: meta.index ? undefined : { index: false, follow: false },
  };
}

/** Atalho para páginas fixas: `export const generateMetadata = sectionMetadata('ranking', '/ranking')`. */
export const sectionMetadata = (section: Section, path: string) => () =>
  pageMetadata({ section, path });
