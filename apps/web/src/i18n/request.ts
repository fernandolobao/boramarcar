import { isValidTimeZone } from '@boramarcar/core/time';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { getUserPreferences } from '@boramarcar/db';
import { getDb } from '@/server/db';
import { getSessionUser } from '@/server/session';
import {
  DEFAULT_TIME_ZONE,
  isLocale,
  LOCALE_COOKIE,
  resolveLocale,
  TIME_ZONE_COOKIE,
} from './config';

/**
 * Idioma salvo no perfil, para quem entrou e ainda não tem o cookie neste navegador ou endereço
 * (ex.: o preview de um deploy). Sem sessão ou sem preferência, `null`.
 */
async function savedLocale(requestHeaders: Headers) {
  try {
    const user = await getSessionUser(requestHeaders);
    if (!user) return null;
    const { locale } = await getUserPreferences(getDb(), user.id);
    return isLocale(locale) ? locale : null;
  } catch {
    return null;
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale(
    isLocale(fromCookie) ? fromCookie : await savedLocale(requestHeaders),
    requestHeaders.get('accept-language'),
  );
  const tzCookie = cookieStore.get(TIME_ZONE_COOKIE)?.value;
  return {
    locale,
    timeZone: isValidTimeZone(tzCookie) ? tzCookie : DEFAULT_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
