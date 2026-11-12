import { getInvitePreview, isMember } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/logo';
import { SignInButton } from '@/components/auth-buttons';
import { JoinInviteButton } from '@/components/invite';
import { getDb } from '@/server/db';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const t = await getTranslations('invite');
  const group = await getInvitePreview(getDb(), codigo);
  return {
    title: t('title'),
    // Prévia do link no WhatsApp/Telegram mostra o nome do grupo.
    openGraph: group ? { title: t('heading', { group: group.name }) } : undefined,
    robots: { index: false },
  };
}

export default async function InvitePage({ params }: Props) {
  const { codigo } = await params;
  const db = getDb();
  const [group, user] = await Promise.all([
    getInvitePreview(db, codigo),
    getSessionUser(await headers()).catch(() => null),
  ]);
  const t = await getTranslations('invite');
  const tc = await getTranslations('common');
  const format = await getFormatter();
  const member = group && user ? await isMember(db, group.id, user.id) : false;

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="focus:outline-none mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-16"
    >
      <Logo
        title={tc('appName')}
        className="h-7 w-auto self-start text-arcano dark:text-pergaminho"
      />
      {!group ? (
        <>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-fg-muted" data-testid="invite-invalid">
            {t('invalid')}
          </p>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {t('heading', { group: group.name })}
            </h1>
            <p className="muted">{t('members', { count: group.members })}</p>
          </div>
          {/* Contexto antes de entrar (onboarding 7.3): primeiros nomes e o próximo encontro. */}
          <div className="card space-y-2">
            {group.firstNames.length > 0 && (
              <p>
                {t('whoIsIn', {
                  names:
                    group.members > group.firstNames.length
                      ? t('andMore', {
                          names: format.list(group.firstNames),
                          count: group.members - group.firstNames.length,
                        })
                      : format.list(group.firstNames),
                })}
              </p>
            )}
            <p className="muted">
              {group.nextEvent
                ? t('nextEvent', {
                    title: group.nextEvent.title,
                    when: format.dateTime(group.nextEvent.startsAt, {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    }),
                  })
                : t('noEvent')}
            </p>
          </div>
          {member ? (
            <div className="space-y-3">
              <p>{t('alreadyMember')}</p>
              <Link href="/painel" className="btn-primary">
                {t('goToDashboard')}
              </Link>
            </div>
          ) : user ? (
            <div>
              <JoinInviteButton inviteCode={group.inviteCode} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-fg-muted">{t('signInToJoin')}</p>
              <SignInButton callbackURL={`/convite/${group.inviteCode}`} />
            </div>
          )}
          {!member && (
            <section aria-labelledby="como-funciona" className="space-y-2">
              <h2 id="como-funciona" className="font-semibold">
                {t('howTitle')}
              </h2>
              <ol className="muted list-decimal space-y-1 ps-5">
                <li>{t('how1')}</li>
                <li>{t('how2')}</li>
                <li>{t('how3')}</li>
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}
