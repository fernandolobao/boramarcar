// Usado tanto em Server quanto em Client Components (não pode ficar num módulo 'use client').

/** Nomes dos dias no idioma do usuário (0 = domingo), via Intl. */
export function weekdayNames(locale: string, style: 'long' | 'short' = 'long') {
  const format = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });
  // 2026-11-01 é domingo
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2026, 10, 1 + i))));
}

/** Ordem de exibição dos dias: segunda primeiro. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
