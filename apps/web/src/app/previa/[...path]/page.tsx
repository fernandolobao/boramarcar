import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/logo';
import { pageMetadata, type Section } from '@/server/seo';
import { deckMetadata } from '@/server/seo-pages';

type Props = { params: Promise<{ path: string[] }> };

/**
 * Prévia de link da área logada para robôs de prévia (WhatsApp, Telegram, Slack…), que não têm
 * login: o `proxy.ts` reescreve para cá em vez de mandar para a home. Mostra só o que é público —
 * título e imagem da seção, ou o deck se ele for público. Nunca indexada.
 */
function sectionFor([first, second, third]: string[]): Section | null {
  switch (first) {
    case 'painel':
      return 'dashboard';
    case 'disponibilidade':
      return 'availability';
    case 'eventos':
      return !second ? 'events' : second === 'historico' ? 'history' : 'event';
    case 'ranking':
      return 'ranking';
    case 'decks':
      if (!second) return 'decks';
      if (second === 'importar') return 'deckImport';
      return third === 'imprimir' ? 'deckPrint' : 'deck';
    case 'colecao':
      return 'collection';
    case 'grupo':
      return 'group';
    case 'perfil':
      return 'profile';
    case 'jogadores':
      return second ? 'player' : null;
    case 'configuracoes':
      return 'settings';
    case 'feedback':
      return 'feedback';
    case 'mesa':
      return second ? 'table' : null;
    default:
      return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const section = sectionFor(path);
  if (!section) return {};
  const href = `/${path.map(encodeURIComponent).join('/')}`;
  if (section === 'deck') return deckMetadata(path[1]!);
  return pageMetadata({ section, path: href });
}

export default async function PreviewPage({ params }: Props) {
  const section = sectionFor((await params).path);
  if (!section) notFound();
  const t = await getTranslations('meta');
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6"
    >
      <Logo className="h-8 w-auto text-fg" />
      <h1 className="page-title">{t(`${section}.title`)}</h1>
      <p>{t(`${section}.description`)}</p>
      <p className="muted">{t('loginToSee')}</p>
      <Link href="/" className="btn-primary self-start">
        {t('loginCta')}
      </Link>
    </main>
  );
}
