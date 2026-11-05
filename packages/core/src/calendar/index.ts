/** Geração de arquivos iCalendar (RFC 5545) e links de compartilhamento. */

export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  /** Sem fim definido, usamos `start + defaultDurationMinutes`. */
  end?: Date | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  status?: 'scheduled' | 'cancelled' | 'finished';
  /** Incrementa a cada alteração para os calendários atualizarem o evento. */
  sequence?: number;
}

export const DEFAULT_EVENT_DURATION_MINUTES = 240;

const toIcsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Escapa texto conforme RFC 5545 §3.3.11. */
export const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

/** Quebra linhas com mais de 75 octetos (RFC 5545 §3.1), sem partir caracteres UTF-8. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const charSize = encoder.encode(char).length;
    const limit = chunks.length === 0 ? 75 : 74; // linhas de continuação começam com espaço
    if (size + charSize > limit) {
      chunks.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += charSize;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const end =
    event.end ?? new Date(event.start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bora Marcar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/** Link "clique para conversar" do WhatsApp com a mensagem preenchida. */
export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Nome de arquivo seguro para downloads (ex.: "commander-de-sabado.ics"). */
export function slugify(value: string, fallback = 'evento'): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
