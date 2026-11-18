import { updateUserPreferences } from '@boramarcar/db';
import { z } from 'zod';
import { LOCALE_COOKIE, LOCALES } from '@/i18n/config';
import { preferenceCookie } from '@/server/cookies';
import { getDb } from '@/server/db';
import { errorResponse, parseJson } from '@/server/http';
import { getSessionUser } from '@/server/session';

const schema = z.object({ locale: z.enum(LOCALES) });

/**
 * Seletor de idioma das páginas públicas (sem login): grava o cookie de idioma e, para quem
 * entrou, também a preferência do perfil (usada nos e-mails e em outros navegadores).
 */
export async function PUT(req: Request): Promise<Response> {
  try {
    const { locale } = await parseJson(req, schema);
    const user = await getSessionUser(req.headers);
    if (user) await updateUserPreferences(getDb(), { userId: user.id, locale });
    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': preferenceCookie(LOCALE_COOKIE, locale) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
