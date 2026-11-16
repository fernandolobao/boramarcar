/**
 * Datas e horas como texto ('AAAA-MM-DD' e 'HH:MM'), nunca `Date`: o fuso fica fora dos
 * componentes (a conversão para UTC é feita por quem envia, com `zonedLocalToUtc`).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');
const toDateString = (d: Date) =>
  `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromDateString = (date: string) => {
  const [, y, m, d] = DATE_RE.exec(date)!;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
};

export function isDateString(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  return toDateString(fromDateString(value)) === value;
}

export const isTimeString = (value: string): boolean => TIME_RE.test(value);

export function addDaysToDate(date: string, days: number): string {
  const d = fromDateString(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

/** Soma meses; num mês mais curto, fica no último dia (31/jan + 1 mês = 28/fev). */
export function addMonthsToDate(date: string, months: number): string {
  const d = fromDateString(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return toDateString(target);
}

/** Datas no formato 'AAAA-MM-DD' comparam como texto. */
export const compareDates = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function clampDate(date: string, min?: string, max?: string): string {
  if (min && compareDates(date, min) < 0) return min;
  if (max && compareDates(date, max) > 0) return max;
  return date;
}

/**
 * Grade do mês para o calendário: semanas com 7 posições, `null` fora do mês.
 * `month` de 1 a 12; `weekStartsOn` 0 = domingo, 1 = segunda.
 */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${pad(year, 4)}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Soma minutos a um horário, dando a volta no dia (23:30 + 60 = 00:30). */
export function stepTime(time: string, deltaMinutes: number): string {
  const [h, m] = time.split(':').map(Number) as [number, number];
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

interface FieldBase {
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}

/** Contrato do `DateField` (site e app). */
export interface DateFieldProps extends FieldBase {
  value: string | null;
  onChange(value: string | null): void;
  min?: string;
  max?: string;
  labels: { open: string; previousMonth: string; nextMonth: string };
}

/** Contrato do `TimeField` (site e app). */
export interface TimeFieldProps extends FieldBase {
  value: string;
  onChange(value: string): void;
  /** Passo do −/+ em minutos (padrão 30). */
  step?: number;
  labels: { decrease: string; increase: string };
}
