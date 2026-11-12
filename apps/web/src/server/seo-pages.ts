import 'server-only';
import { getPublicDeckPreview } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { getDb } from './db';
import { pageMetadata } from './seo';

/**
 * Prévias com dados próprios, só do que já é público: deck com visibilidade "pública" (nome,
 * comandantes e arte) e convite (nome do grupo e quantas pessoas). O resto fica genérico.
 */
export async function deckMetadata(deckId: string, title?: string) {
  const deck = await getPublicDeckPreview(getDb(), deckId).catch(() => null);
  const t = await getTranslations('meta');
  if (!deck) return pageMetadata({ section: 'deck', path: `/decks/${deckId}`, title });
  return pageMetadata({
    section: 'deck',
    path: `/decks/${deckId}`,
    title: title ?? deck.name,
    description: deck.commanders.length
      ? t('deckPreview', { commanders: deck.commanders.join(' + ') })
      : undefined,
    image: { url: `/og/deck/${deckId}`, alt: deck.name },
  });
}

export async function inviteMetadata(code: string, groupName: string | null, title: string) {
  const t = await getTranslations('meta');
  const ti = await getTranslations('invite');
  if (!groupName) return pageMetadata({ section: 'invite', path: `/convite/${code}`, title });
  return pageMetadata({
    section: 'invite',
    path: `/convite/${code}`,
    title: ti('heading', { group: groupName }),
    description: t('invitePreview', { group: groupName }),
    image: { url: `/og/convite/${code}`, alt: ti('heading', { group: groupName }) },
  });
}
