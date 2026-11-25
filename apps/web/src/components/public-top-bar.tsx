import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { getSessionUser } from '@/server/session';
import { Icon } from './icons';
import { Logo } from './logo';

/**
 * Topo das páginas públicas (lojas, torneio, resumo, retrospectiva, convite de loja): o logo e uma
 * saída. Quem entrou volta ao painel; quem não entrou vê "Entrar". Sem isso, no site instalado
 * como app (sem o botão de voltar do navegador), essas páginas viravam um beco sem saída.
 */
export async function PublicTopBar() {
  const [t, tc, user] = await Promise.all([
    getTranslations('publicNav'),
    getTranslations('common'),
    getSessionUser(await headers()).catch(() => null),
  ]);
  return (
    <nav aria-label={t('label')} className="flex items-center justify-between gap-3">
      <Link
        href={user ? '/painel' : '/'}
        className="rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>
      {user ? (
        <Link href="/painel" className="btn-secondary px-3 py-1.5 text-sm">
          <Icon name="back" />
          {t('dashboard')}
        </Link>
      ) : (
        <Link href="/entrar" className="btn-secondary px-3 py-1.5 text-sm">
          {t('signIn')}
        </Link>
      )}
    </nav>
  );
}
