import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedE2E, signedSessionCookie, E2E_SESSION_TOKEN } from './seed';

export const AUTH_STATE = 'e2e/.auth/ana.json';

/**
 * Com E2E_DATABASE_URL definido, popula o banco e salva a sessão da Ana para os testes
 * autenticados. Sem banco, só os testes públicos rodam.
 */
export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) return;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET é obrigatório para os testes E2E autenticados');
  await seedE2E(databaseUrl);
  const baseURL = new URL(
    process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  );
  mkdirSync(dirname(AUTH_STATE), { recursive: true });
  writeFileSync(
    AUTH_STATE,
    JSON.stringify({
      cookies: [
        {
          name: 'better-auth.session_token',
          value: signedSessionCookie(E2E_SESSION_TOKEN, secret),
          domain: baseURL.hostname,
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'bm_tz',
          value: 'America%2FSao_Paulo',
          domain: baseURL.hostname,
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    }),
  );
}
