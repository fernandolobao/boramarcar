import { getInvitePreview, getPublicDeckPreview } from '@boramarcar/db';
import { createTranslator } from 'next-intl';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getDb } from '@/server/db';
import { renderOg } from '@/server/og/image';
import { isSection } from '@/server/seo';
import ptBR from '../../../../messages/pt-BR.json';

/**
 * Imagens de compartilhamento (Open Graph), em português (quem gera a prévia não manda idioma):
 * - `/og/s/<seção>`: título e descrição da seção;
 * - `/og/deck/<id>`: deck **público** com a arte do comandante (os demais caem na imagem de deck);
 * - `/og/convite/<código>`: nome do grupo e quantas pessoas já estão.
 */
const t = createTranslator({ locale: DEFAULT_LOCALE, messages: ptBR, namespace: 'meta' });

/** Arte remota só do Scryfall; se não carregar, o cartão sai sem fundo. */
async function artDataUri(url: string | null) {
  if (!url?.startsWith('https://cards.scryfall.io/')) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? 'image/jpeg';
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

const section = (key: Parameters<typeof isSection>[0]) =>
  isSection(key) && key !== 'home'
    ? renderOg({ title: t(`${key}.title`), subtitle: t(`${key}.description`) })
    : new Response('Não encontrado', { status: 404 });

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  const [kind, id] = (await ctx.params).slug;
  if (kind === 's' && id) return section(id);
  if (kind === 'deck' && id) {
    const deck = await getPublicDeckPreview(getDb(), id).catch(() => null);
    if (!deck) return section('deck');
    return renderOg({
      eyebrow: t('deck.title'),
      title: deck.name,
      subtitle: deck.commanders.length ? deck.commanders.join(' + ') : undefined,
      background: await artDataUri(deck.artUri),
    });
  }
  if (kind === 'convite' && id) {
    const group = await getInvitePreview(getDb(), id).catch(() => null);
    if (!group) return section('invite');
    return renderOg({
      eyebrow: t('invite.title'),
      title: group.name,
      subtitle: t('inviteImage', { count: group.members }),
    });
  }
  return new Response('Não encontrado', { status: 404 });
}
