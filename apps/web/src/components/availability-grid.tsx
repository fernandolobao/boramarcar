'use client';

import type { WeekGrid } from '@boramarcar/core/availability';
import { useFormatter, useTranslations } from 'next-intl';
import { useRef, useState, type KeyboardEvent } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';

interface Props {
  groupId: string;
  grid: WeekGrid;
  members: { userId: string; name: string }[];
  minPlayers: number;
}

/**
 * Grade semanal (padrão ARIA "grid"): uma parada de Tab, navegação pelas setas,
 * Home/End na linha e Enter/Espaço para marcar ou desmarcar a própria disponibilidade.
 */
export function AvailabilityGrid({ groupId, grid, members, minPlayers }: Props) {
  const t = useTranslations('availability');
  const format = useFormatter();
  const { run, error, pending } = useApiAction();
  const [active, setActive] = useState<[number, number]>([0, 0]); // [hora, dia]
  const cellRefs = useRef<(HTMLButtonElement | null)[][]>([]);
  const names = new Map(members.map((m) => [m.userId, m.name]));
  const dayDate = (day: string) => new Date(`${day}T12:00:00Z`);

  const focusCell = (row: number, col: number) => {
    const r = Math.max(0, Math.min(grid.hours.length - 1, row));
    const c = Math.max(0, Math.min(grid.days.length - 1, col));
    setActive([r, c]);
    cellRefs.current[r]?.[c]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, row: number, col: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [row - 1, col],
      ArrowDown: [row + 1, col],
      ArrowLeft: [row, col - 1],
      ArrowRight: [row, col + 1],
      Home: [row, 0],
      End: [row, grid.days.length - 1],
      PageUp: [0, col],
      PageDown: [grid.hours.length - 1, col],
    };
    const target = moves[e.key];
    if (!target) return;
    e.preventDefault();
    focusCell(...target);
  };

  const toggle = (dayIndex: number, hourIndex: number) => {
    const cell = grid.cells[dayIndex]![hourIndex]!;
    if (cell.mine === 'weekly') return;
    void run(() =>
      api(`/api/v1/groups/${groupId}/availability/range`, {
        method: 'PUT',
        body: { start: cell.start, end: cell.end, available: cell.mine === 'none' },
      }),
    );
  };

  const first = grid.days[0]!;
  const last = grid.days[grid.days.length - 1]!;

  return (
    <div className="space-y-3">
      <p id="grid-hint" className="muted">
        {t('gridHint')}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t('legend')}>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded bg-brand-600" />
          {t('legendFull', { min: minPlayers })}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded ring-2 ring-ink-900 ring-inset dark:ring-ink-100"
          />
          {t('legendMine')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true">↻</span>
          {t('legendWeekly')}
        </li>
      </ul>
      <div className="overflow-x-auto">
        {/* <table role="grid"> é o padrão de grade de dados do ARIA APG; a regra do lint é um falso positivo. */}
        <table
          role="grid" // eslint-disable-line jsx-a11y/no-noninteractive-element-to-interactive-role
          aria-describedby="grid-hint"
          aria-readonly={false}
          className="w-full min-w-[15rem] table-fixed border-separate border-spacing-0.5 text-xs sm:border-spacing-1"
        >
          <caption className="sr-only">
            {t('gridCaption', {
              start: format.dateTime(dayDate(first), {
                day: '2-digit',
                month: 'short',
                timeZone: 'UTC',
              }),
              end: format.dateTime(dayDate(last), {
                day: '2-digit',
                month: 'short',
                timeZone: 'UTC',
              }),
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10 text-left font-medium text-ink-600 dark:text-ink-400">
                <span className="sr-only">{t('hour')}</span>
              </th>
              {grid.days.map((day) => (
                <th key={day} scope="col" className="font-medium">
                  <span className="block capitalize">
                    {format.dateTime(dayDate(day), { weekday: 'short', timeZone: 'UTC' })}
                  </span>
                  <span className="block text-ink-600 dark:text-ink-400">
                    {format.dateTime(dayDate(day), {
                      day: '2-digit',
                      month: '2-digit',
                      timeZone: 'UTC',
                    })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.hours.map((hour, hourIndex) => (
              <tr key={hour}>
                <th
                  scope="row"
                  className="pr-1 text-right font-medium tabular-nums text-ink-600 dark:text-ink-400"
                >
                  {String(hour).padStart(2, '0')}h
                </th>
                {grid.days.map((day, dayIndex) => {
                  const cell = grid.cells[dayIndex]![hourIndex]!;
                  const count = cell.userIds.length;
                  const full = count >= minPlayers;
                  const isActive = active[0] === hourIndex && active[1] === dayIndex;
                  const label = t('cellLabel', {
                    day: format.dateTime(dayDate(day), {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'UTC',
                    }),
                    time: `${String(hour).padStart(2, '0')}h`,
                    count,
                    names: count
                      ? ` (${cell.userIds.map((id) => names.get(id) ?? id).join(', ')})`
                      : '',
                    mine: t(
                      cell.mine === 'once'
                        ? 'cellMineOnce'
                        : cell.mine === 'weekly'
                          ? 'cellMineWeekly'
                          : 'cellMineNone',
                    ),
                  });
                  return (
                    <td key={day} role="gridcell" className="p-0">
                      <button
                        ref={(el) => {
                          (cellRefs.current[hourIndex] ??= [])[dayIndex] = el;
                        }}
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-label={label}
                        aria-pressed={cell.mine !== 'none'}
                        aria-disabled={cell.mine === 'weekly' || pending}
                        title={label}
                        onFocus={() => setActive([hourIndex, dayIndex])}
                        onKeyDown={(e) => onKeyDown(e, hourIndex, dayIndex)}
                        onClick={() => toggle(dayIndex, hourIndex)}
                        className={[
                          'flex h-8 w-full items-center justify-center gap-0.5 rounded-md tabular-nums',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500',
                          'aria-disabled:cursor-not-allowed',
                          full
                            ? 'bg-brand-600 font-semibold text-white'
                            : count
                              ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100'
                              : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400',
                          cell.mine !== 'none'
                            ? 'ring-2 ring-ink-900 ring-inset dark:ring-ink-100'
                            : '',
                        ].join(' ')}
                      >
                        <span aria-hidden="true">{count || ''}</span>
                        {cell.mine === 'weekly' && <span aria-hidden="true">↻</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormError message={error} />
    </div>
  );
}
