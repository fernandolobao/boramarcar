export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export { DEFAULT_TIME_ZONE } from '@boramarcar/core/time';
/** Cookie com o fuso do usuário (espelho do campo `user.time_zone`, lido a cada requisição). */
export const TIME_ZONE_COOKIE = 'bm_tz';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Escolhe o idioma pelo cookie e, em seguida, pelo Accept-Language. */
export function resolveLocale(cookieValue?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter((tag): tag is string => Boolean(tag));
  const base = (tag: string) => tag.split('-')[0];
  for (const tag of preferred) {
    const match =
      LOCALES.find((l) => l.toLowerCase() === tag) ??
      LOCALES.find((l) => base(l.toLowerCase()) === base(tag));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
