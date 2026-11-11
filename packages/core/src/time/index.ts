import { DomainError } from '../errors';

export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Verifica se o fuso é um identificador IANA aceito pelo runtime (ex.: "America/Sao_Paulo"). */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function assertTimeZone(timeZone: unknown): asserts timeZone is string {
  if (!isValidTimeZone(timeZone)) throw new DomainError('invalid_input', 'Fuso horário inválido');
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClockIn(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Diferença (em ms) entre o relógio local do fuso e UTC naquele instante. */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const w = wallClockIn(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Converte o valor de um `<input type="datetime-local">` ("2026-11-14T19:30"),
 * interpretado no fuso do usuário, para um instante UTC.
 * Em horários "pulados" por mudança de horário de verão, avança para o horário válido.
 */
export function zonedLocalToUtc(value: string, timeZone: string): Date {
  assertTimeZone(timeZone);
  const match = LOCAL_INPUT_RE.exec(value);
  if (!match) throw new DomainError('invalid_input', 'Data/hora inválida');
  const [, y, mo, d, h, mi, s] = match.map(Number) as number[];
  const naiveUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!, s || 0);
  const o1 = timeZoneOffsetMs(new Date(naiveUtc), timeZone);
  const c1 = naiveUtc - o1;
  const o2 = timeZoneOffsetMs(new Date(c1), timeZone);
  if (o1 === o2) return new Date(c1);
  // Perto de uma troca de horário de verão: fica com o candidato cujo relógio local bate.
  const c2 = naiveUtc - o2;
  const target = value.length === 16 ? value : value.slice(0, 16);
  if (utcToZonedLocalInput(new Date(c2), timeZone) === target) return new Date(c2);
  if (utcToZonedLocalInput(new Date(c1), timeZone) === target) return new Date(c1);
  // Horário inexistente (relógio adiantado): avança para depois da troca.
  return new Date(Math.max(c1, c2));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Formata um instante como valor de `<input type="datetime-local">` no fuso do usuário. */
export function utcToZonedLocalInput(date: Date, timeZone: string): string {
  assertTimeZone(timeZone);
  const w = wallClockIn(date, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** Soma `days` dias a uma data local "AAAA-MM-DD" (sem depender de fuso). */
export function addLocalDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T12:00:00Z`);
  if (Number.isNaN(ms)) throw new DomainError('invalid_input', 'Data inválida');
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Início e fim (opcional) a partir de uma data e horários locais ("19:00") no fuso do usuário.
 * Fim menor ou igual ao início = termina no dia seguinte (ex.: 20:00–01:00).
 */
export function localRangeToUtc(
  date: string,
  start: string,
  end: string | null,
  timeZone: string,
): { startsAt: Date; endsAt: Date | null } {
  const startsAt = zonedLocalToUtc(`${date}T${start}`, timeZone);
  if (end === null) return { startsAt, endsAt: null };
  const endDate = end <= start ? addLocalDays(date, 1) : date;
  return { startsAt, endsAt: zonedLocalToUtc(`${endDate}T${end}`, timeZone) };
}
