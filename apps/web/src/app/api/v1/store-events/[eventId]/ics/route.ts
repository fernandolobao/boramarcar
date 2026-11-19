import { DomainError } from '@boramarcar/core';
import { buildIcs, slugify } from '@boramarcar/core/calendar';
import { getStoreEventPublic } from '@boramarcar/db';
import { getBaseUrl } from '@/env';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';

/**
 * "Adicionar à agenda" de um evento de loja (10.3), sem login: arquivo .ics do evento agendado.
 * Só dados públicos do evento e da loja.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await ctx.params;
    const event = await getStoreEventPublic(getDb(), { eventId });
    if (!event || event.status !== 'scheduled') {
      throw new DomainError('not_found', 'Evento não encontrado');
    }
    const url = `${getBaseUrl()}/lojas/${event.store.slug}/eventos/${event.id}`;
    const content = buildIcs({
      uid: `store-event-${event.id}@arcanakin.com.br`,
      title: `${event.title} · ${event.store.name}`,
      start: event.startsAt,
      end: event.endsAt,
      location: event.store.name,
      url,
      description: url,
      status: 'scheduled',
    });
    return new Response(content, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(event.title)}.ics"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
