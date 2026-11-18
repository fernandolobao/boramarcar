export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export { DEFAULT_TIME_ZONE } from '@boramarcar/core/time';
/** Cookie com o fuso do usuário (espelho do campo `user.time_zone`, lido a cada requisição). */
export const TIME_ZONE_COOKIE = 'bm_tz';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Países de língua portuguesa (código do cabeçalho `x-vercel-ip-country`). */
const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);

/**
 * Escolhe o idioma: a escolha feita (cookie) manda; sem ela, português para quem acessa de um
 * país de língua portuguesa ou tem português em qualquer posição do navegador (muita gente no
 * Brasil usa o navegador em inglês); depois, o primeiro idioma do navegador que conhecemos.
 */
export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null,
  country?: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter((tag): tag is string => Boolean(tag));
  const base = (tag: string) => tag.split('-')[0];
  if (PORTUGUESE_COUNTRIES.has((country ?? '').toUpperCase())) return 'pt-BR';
  if (preferred.some((tag) => base(tag) === 'pt')) return 'pt-BR';
  for (const tag of preferred) {
    const match =
      LOCALES.find((l) => l.toLowerCase() === tag) ??
      LOCALES.find((l) => base(l.toLowerCase()) === base(tag));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
