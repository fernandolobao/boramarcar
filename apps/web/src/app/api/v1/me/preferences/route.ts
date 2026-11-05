import { getUserPreferences, updateUserPreferences } from '@boramarcar/db';
import { z } from 'zod';
import { LOCALE_COOKIE, LOCALES, TIME_ZONE_COOKIE } from '@/i18n/config';
import { preferenceCookie } from '@/server/cookies';
import { authed, parseJson } from '@/server/http';

export const GET = authed(async ({ db, user }) => ({
  preferences: await getUserPreferences(db, user.id),
}));

const schema = z
  .object({ timeZone: z.string().min(1).max(64).optional(), locale: z.enum(LOCALES).optional() })
  .refine((v) => v.timeZone || v.locale, { message: 'Informe timeZone ou locale' });

export const PUT = authed(async ({ req, db, user }) => {
  const body = await parseJson(req, schema);
  const response = Response.json({ preferences: body });
  if (body.timeZone) {
    await updateUserPreferences(db, { userId: user.id, timeZone: body.timeZone });
    response.headers.append('Set-Cookie', preferenceCookie(TIME_ZONE_COOKIE, body.timeZone));
  }
  if (body.locale) {
    response.headers.append('Set-Cookie', preferenceCookie(LOCALE_COOKIE, body.locale));
  }
  return response;
});
