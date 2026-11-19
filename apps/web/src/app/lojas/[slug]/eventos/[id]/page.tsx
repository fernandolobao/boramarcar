import { isGameFormat } from '@boramarcar/core';
import { getStoreEventPublic, listMyStores } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { StoreEventRegistration } from '@/components/stores/store-events';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ slug: string; id: string }> };

async function load(slug: string, id: string, viewerId?: string | null) {
  const event = await getStoreEventPublic(getDb(), { eventId: id, viewerId }).catch(() => null);
  return event && event.store.slug === slug ? event : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const path = `/lojas/${slug}/eventos/${id}`;
  const event = await load(slug, id);
  if (!event) return pageMetadata({ section: 'group', path });
  const [t, tf] = await Promise.all([getTranslations('storeEvents'), getTranslations('formats')]);
  return pageMetadata({
    section: 'group',
    path,
    title: `${event.title} · ${event.store.name}`,
    description: t('metaDescription', {
      title: event.title,
      store: event.store.name,
      kind: t(`kind.${event.kind as 'tournament' | 'casual'}`).toLowerCase(),
      format: tf(isGameFormat(event.format) ? event.format : 'other'),
    }),
    index: true,
  });
}

/**
 * Evento de loja (10.2a), público: quando, formato, vagas (contagem, sem nomes), premiação e
 * regras. Com login, a pessoa se inscreve ou desiste; a equipe vê o atalho para gerenciar.
 */
export default async function StoreEventPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await getSessionUser(await headers()).catch(() => null);
  const event = await load(slug, id, session?.id);
  if (!event) notFound();
  const [t, tf, tc, format, staff] = await Promise.all([
    getTranslations('storeEvents'),
    getTranslations('formats'),
    getTranslations('common'),
    getFormatter(),
    session
      ? listMyStores(getDb(), { userId: session.id }).then((s) => s.some((x) => x.slug === slug))
      : false,
  ]);
  const cancelled = event.status === 'cancelled';
  const formatName = tf(isGameFormat(event.format) ? event.format : 'other');

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <Link
        href="/"
        className="self-start rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>
      <div className="space-y-2">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
          {t(`kind.${event.kind as 'tournament' | 'casual'}`)} · {formatName}
        </p>
        <h1 className="page-title">{event.title}</h1>
        <p>
          <Link href={`/lojas/${slug}`} className="underline underline-offset-2">
            {event.store.name}
          </Link>
        </p>
        <p className="text-lg">
          <span className="sr-only">{t('when')}: </span>
          {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        {cancelled && (
          <p role="status" className="font-semibold text-danger">
            {t('eventCancelled')}
          </p>
        )}
      </div>

      <section className="card space-y-3" aria-labelledby="evento-vagas">
        <h2 id="evento-vagas" className="sr-only">
          {t('entries')}
        </h2>
        <p className="text-lg font-semibold tabular-nums">
          {event.capacity
            ? t('spots', { registered: event.registered, capacity: event.capacity })
            : t('spotsOpen', { registered: event.registered })}
          {event.waitlist > 0 && (
            <span className="muted text-base font-normal">
              {' · '}
              {t('waitlistCount', { count: event.waitlist })}
            </span>
          )}
        </p>
        {!cancelled &&
          (session ? (
            <StoreEventRegistration eventId={event.id} myEntry={event.myEntry} />
          ) : (
            <Link
              href={`/entrar?para=${encodeURIComponent(`/lojas/${slug}/eventos/${id}`)}`}
              className="btn-primary"
            >
              {t('signInToRegister')}
            </Link>
          ))}
        {staff && (
          <Link href={`/lojas/${slug}/eventos/${id}/gerenciar`} className="btn-secondary">
            <Icon name="edit" />
            {t('manageEvent')}
          </Link>
        )}
      </section>

      {event.prizes && (
        <section className="card space-y-2" aria-labelledby="evento-premiacao">
          <h2 id="evento-premiacao" className="section-title mb-0">
            {t('prizes')}
          </h2>
          <p className="whitespace-pre-line">{event.prizes}</p>
        </section>
      )}
      {event.rules && (
        <section className="card space-y-2" aria-labelledby="evento-regras">
          <h2 id="evento-regras" className="section-title mb-0">
            {t('rules')}
          </h2>
          <p className="whitespace-pre-line">{event.rules}</p>
        </section>
      )}
    </main>
  );
}
