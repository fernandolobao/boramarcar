import { buildIcs, slugify } from '@boramarcar/core';
import { getBaseUrl } from '@/env';

export const eventUrl = (eventId: string) => `${getBaseUrl()}/eventos/${eventId}`;

export interface IcsEventInput {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  status: 'scheduled' | 'cancelled' | 'finished';
  sequence: number;
  location: { name: string; address: string | null } | null;
  confirmed: string[];
}

/** Arquivo .ics do encontro (download e anexo dos e-mails usam o mesmo UID e SEQUENCE). */
export function eventIcs(event: IcsEventInput) {
  const url = eventUrl(event.id);
  return {
    filename: `${slugify(event.title)}.ics`,
    content: buildIcs({
      uid: `${event.id}@boramarcar`,
      title: event.title,
      start: event.startsAt,
      end: event.endsAt,
      location: event.location
        ? [event.location.name, event.location.address].filter(Boolean).join(', ')
        : null,
      description: [event.confirmed.length ? `✅ ${event.confirmed.join(', ')}` : null, url]
        .filter(Boolean)
        .join('\n'),
      url,
      status: event.status,
      sequence: event.sequence,
    }),
  };
}
