import { getStoreInvite } from '@boramarcar/db';
import { PublicTopBar } from '@/components/public-top-bar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { AcceptStoreInvite } from '@/components/stores/store-manage';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranslations('stores');
  return pageMetadata({
    section: 'group',
    path: `/loja/convite/${token}`,
    title: t('inviteTitle'),
    description: t('inviteMetaDescription'),
  });
}

/**
 * Convite de loja (10.1): mostra a loja e o papel; quem está logado aceita (só vale para a conta
 * com o e-mail convidado, conferido na API); quem não está entra antes, voltando para cá.
 */
export default async function StoreInvitePage({ params }: Props) {
  const { token } = await params;
  const [invite, t, , session] = await Promise.all([
    getStoreInvite(getDb(), { token }).catch(() => null),
    getTranslations('stores'),
    getTranslations('common'),
    getSessionUser(await headers()).catch(() => null),
  ]);
  const path = `/loja/convite/${token}`;
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <PublicTopBar />
      <h1 className="page-title">{t('inviteTitle')}</h1>
      {!invite ? (
        <p>{t('inviteMissing')}</p>
      ) : invite.status === 'used' ? (
        <p>{t('inviteUsed')}</p>
      ) : invite.status === 'expired' ? (
        <p>{t('inviteExpired')}</p>
      ) : (
        <section className="card space-y-3">
          <p className="text-lg">{t(`inviteIntro.${invite.role}`, { store: invite.storeName })}</p>
          <p className="muted text-sm">{t('inviteEmailHint')}</p>
          {session ? (
            <AcceptStoreInvite token={token} />
          ) : (
            <Link href={`/entrar?para=${encodeURIComponent(path)}`} className="btn-primary">
              {t('signInToAccept')}
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
