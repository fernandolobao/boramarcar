import { buildIcs, slugify } from '@boramarcar/core';
import { getEventDetail } from '@boramarcar/db';
import { eventUrl } from '@/server/event-share';
import { authed } from '@/server/http';

/** Arquivo .ics para adicionar o encontro ao Google Agenda, Apple Calendário, Outlook etc. */
export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => {
  const event = await getEventDetail(db, { eventId: params.eventId, userId: user.id });
  const url = eventUrl(event.id);
  const confirmed = event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.name);
  const ics = buildIcs({
    uid: `${event.id}@boramarcar`,
    title: event.title,
    start: event.startsAt,
    end: event.endsAt,
    location: event.location
      ? [event.location.name, event.location.address].filter(Boolean).join(', ')
      : null,
    description: [confirmed.length ? `✅ ${confirmed.join(', ')}` : null, url]
      .filter(Boolean)
      .join('\n'),
    url,
    status: event.status,
    sequence: event.sequence,
  });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slugify(event.title)}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
