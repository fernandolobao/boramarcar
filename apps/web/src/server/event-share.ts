import 'server-only';
import type { getEventDetail } from '@boramarcar/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getBaseUrl } from '@/env';

type EventDetail = Awaited<ReturnType<typeof getEventDetail>>;

export const eventUrl = (eventId: string) => `${getBaseUrl()}/eventos/${eventId}`;

/** Texto para compartilhar o encontro (WhatsApp, Web Share), no idioma e fuso do usuário. */
export async function buildEventShareText(event: EventDetail) {
  const t = await getTranslations('share');
  const tc = await getTranslations('common');
  const format = await getFormatter();
  const when = event.endsAt
    ? format.dateTimeRange(event.startsAt, event.endsAt, { dateStyle: 'full', timeStyle: 'short' })
    : format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' });
  const where = event.location
    ? [event.location.name, event.location.address].filter(Boolean).join(' — ')
    : tc('locationTbd');
  const confirmed = event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.name);

  return [
    event.status === 'cancelled'
      ? t('cancelledPrefix', { title: event.title })
      : t('title', { title: event.title }),
    t('when', { when }),
    t('where', { where }),
    confirmed.length
      ? t('confirmed', { names: confirmed.join(', '), count: confirmed.length })
      : null,
    t('link', { url: eventUrl(event.id) }),
  ]
    .filter(Boolean)
    .join('\n');
}
