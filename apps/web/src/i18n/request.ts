import { isValidTimeZone } from '@boramarcar/core/time';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_TIME_ZONE, LOCALE_COOKIE, resolveLocale, TIME_ZONE_COOKIE } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  );
  const tzCookie = cookieStore.get(TIME_ZONE_COOKIE)?.value;
  return {
    locale,
    timeZone: isValidTimeZone(tzCookie) ? tzCookie : DEFAULT_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
