import { zonedLocalToUtc } from '@boramarcar/core/time';
import { locale } from './i18n';

/** Fuso do aparelho (o mesmo que o site usa para quem não escolheu outro). */
export const deviceTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

const DAY = 24 * 60 * 60 * 1000;

/** Data local (AAAA-MM-DD) de um instante no fuso. */
export const localDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** Próximos `count` dias a partir de hoje, no fuso. */
export const nextDays = (count: number, timeZone: string, now = new Date()) => {
  const today = localDate(now, timeZone);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
};

/** Horários de meia em meia hora ("00:00" … "23:30"). */
export const HALF_HOURS = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);

/** Anda `steps` meias horas no relógio (dá a volta à meia-noite). */
export const stepTime = (time: string, steps: number) => {
  const index = HALF_HOURS.indexOf(time);
  return HALF_HOURS[((((index < 0 ? 0 : index) + steps) % 48) + 48) % 48]!;
};

/**
 * Início e fim de uma disponibilidade avulsa em UTC. Fim menor ou igual ao início = termina no
 * dia seguinte (ex.: 19:00–01:00).
 */
export function slotRange(date: string, start: string, end: string, timeZone: string) {
  const startsAt = zonedLocalToUtc(`${date}T${start}`, timeZone);
  const endDate = end <= start ? addDays(date, 1) : date;
  return { startsAt, endsAt: zonedLocalToUtc(`${endDate}T${end}`, timeZone) };
}

/** Segunda a domingo (0 = domingo, como no servidor). */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Nomes dos dias da semana no idioma do app (índice 0 = domingo). */
export const weekdayName = (weekday: number, style: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    // 4 de janeiro de 1970 foi um domingo.
    new Date(Date.UTC(1970, 0, 4 + weekday, 12)),
  );

/** "sáb., 14 de nov." de uma data local. */
export const dayLabel = (date: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));

/** "sáb., 14 de nov., 19:00–23:00" (ou com as duas datas se passar de um dia). */
export function rangeLabel(start: Date, end: Date, timeZone: string) {
  const day = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone,
    }).format(d);
  const time = (d: Date) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(d);
  const sameDay = localDate(start, timeZone) === localDate(end, timeZone);
  return sameDay
    ? `${day(start)}, ${time(start)}–${time(end)}`
    : `${day(start)}, ${time(start)} – ${day(end)}, ${time(end)}`;
}
