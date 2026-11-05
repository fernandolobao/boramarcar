import { getEventDetail } from '@boramarcar/db';
import { eventIcs } from '@/server/event-ics';
import { authed } from '@/server/http';

/** Arquivo .ics para adicionar o encontro ao Google Agenda, Apple Calendário, Outlook etc. */
export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => {
  const event = await getEventDetail(db, { eventId: params.eventId, userId: user.id });
  const ics = eventIcs({
    ...event,
    confirmed: event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.name),
  });
  return new Response(ics.content, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ics.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
