import { getUserPreferences, updateUserPreferences } from '@boramarcar/db';
import { z } from 'zod';
import { LOCALE_COOKIE, LOCALES, TIME_ZONE_COOKIE } from '@/i18n/config';
import { preferenceCookie } from '@/server/cookies';
import { authed, parseJson } from '@/server/http';

export const GET = authed(async ({ db, user }) => ({
  preferences: await getUserPreferences(db, user.id),
}));

const schema = z
  .object({
    timeZone: z.string().min(1).max(64).optional(),
    locale: z.enum(LOCALES).optional(),
    emailNotifications: z.boolean().optional(),
    /** Cidade do perfil (10.3): código IBGE, ou `null` para tirar. */
    municipalityCode: z
      .string()
      .regex(/^\d{7}$/)
      .nullable()
      .optional(),
  })
  .refine(
    (v) =>
      v.timeZone ||
      v.locale ||
      v.emailNotifications !== undefined ||
      v.municipalityCode !== undefined,
    { message: 'Informe timeZone, locale, emailNotifications ou municipalityCode' },
  );

/** Salva fuso, idioma (também usados nos e-mails) e se a pessoa quer receber avisos. */
export const PUT = authed(async ({ req, db, user }) => {
  const body = await parseJson(req, schema);
  const preferences = await updateUserPreferences(db, { userId: user.id, ...body });
  const response = Response.json({ preferences });
  if (body.timeZone) {
    response.headers.append('Set-Cookie', preferenceCookie(TIME_ZONE_COOKIE, body.timeZone));
  }
  if (body.locale) {
    response.headers.append('Set-Cookie', preferenceCookie(LOCALE_COOKIE, body.locale));
  }
  return response;
});
