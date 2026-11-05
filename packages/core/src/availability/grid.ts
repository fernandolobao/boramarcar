import { utcToZonedLocalInput, zonedLocalToUtc } from '../time';

export interface GridSlot {
  userId: string;
  start: Date;
  end: Date;
  /** "once" = avulsa (editável na grade); "weekly" = regra recorrente. */
  kind: 'once' | 'weekly';
}

export interface GridCell {
  /** Início/fim da célula em ISO (UTC). */
  start: string;
  end: string;
  userIds: string[];
  /** Como o usuário atual aparece nesta célula. */
  mine: 'none' | 'once' | 'weekly';
}

export interface WeekGrid {
  /** Datas locais ("AAAA-MM-DD") dos 7 dias, começando na segunda-feira. */
  days: string[];
  /** Horas locais exibidas (ex.: 8 … 23). */
  hours: number[];
  /** cells[dia][hora] */
  cells: GridCell[][];
}

const DAY = 86_400_000;
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** Segunda-feira (data local) da semana que contém `date` no fuso informado. */
export function weekStartFor(date: Date, timeZone: string): string {
  const local = utcToZonedLocalInput(date, timeZone).slice(0, 10);
  const weekday = new Date(`${local}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(local, -((weekday + 6) % 7));
}

export const DEFAULT_GRID_HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8h … 23h

/**
 * Monta a grade semanal (7 dias × horas) a partir das disponibilidades. Uma pessoa conta
 * numa célula quando está disponível durante a hora inteira.
 */
export function buildWeekGrid(input: {
  slots: readonly GridSlot[];
  weekStart: string;
  timeZone: string;
  currentUserId: string;
  hours?: readonly number[];
}): WeekGrid {
  const hours = [...(input.hours ?? DEFAULT_GRID_HOURS)];
  const days = Array.from({ length: 7 }, (_, i) => addDays(input.weekStart, i));
  const pad = (n: number) => String(n).padStart(2, '0');

  const cells = days.map((day) =>
    hours.map((hour) => {
      const start = zonedLocalToUtc(`${day}T${pad(hour)}:00`, input.timeZone);
      const end =
        hour === 23
          ? zonedLocalToUtc(`${addDays(day, 1)}T00:00`, input.timeZone)
          : zonedLocalToUtc(`${day}T${pad(hour + 1)}:00`, input.timeZone);
      const covering = input.slots.filter((s) => s.start <= start && s.end >= end);
      const mineSlots = covering.filter((s) => s.userId === input.currentUserId);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        userIds: [...new Set(covering.map((s) => s.userId))].sort(),
        mine: mineSlots.some((s) => s.kind === 'weekly')
          ? ('weekly' as const)
          : mineSlots.length
            ? ('once' as const)
            : ('none' as const),
      };
    }),
  );
  return { days, hours, cells };
}
