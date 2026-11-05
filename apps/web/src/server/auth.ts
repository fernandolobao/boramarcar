import 'server-only';
import { schema } from '@boramarcar/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getBaseUrl, getEnv } from '@/env';
import { getDb } from './db';

function createAuth() {
  const env = getEnv();
  return betterAuth({
    baseURL: getBaseUrl(env),
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: 'select_account',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // nextCookies precisa ser o último plugin.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | null = null;

/** Instância preguiçosa: evita ler variáveis de ambiente durante o build. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
