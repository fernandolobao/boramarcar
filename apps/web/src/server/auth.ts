import 'server-only';
import { schema } from '@boramarcar/db';
import { expo } from '@better-auth/expo';
import { authTrustedOrigins, oauthProxyOptions } from './trusted-origins';
import { betterAuth } from 'better-auth';
import { oAuthProxy } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getBaseUrl, getEnv } from '@/env';
import { getDb } from './db';
import { GOOGLE_SIGN_IN_OPTIONS, syncGoogleProfileImage } from './google-picture';

function createAuth() {
  const env = getEnv();
  const proxy = oauthProxyOptions({
    VERCEL_ENV: process.env.VERCEL_ENV,
    OAUTH_PROXY_SECRET: process.env.OAUTH_PROXY_SECRET,
  });
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
        // Só openid, email e profile (ver google-picture.ts).
        ...GOOGLE_SIGN_IN_OPTIONS,
        scope: [...GOOGLE_SIGN_IN_OPTIONS.scope],
      },
    },
    databaseHooks: {
      account: {
        // A cada login com o Google a conta é criada (primeiro login) ou recebe tokens novos
        // (logins seguintes): é aí que a foto do Google é sincronizada (ver google-picture.ts).
        create: { after: (account) => syncImage(account) },
        update: { after: (account) => syncImage(account) },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // App mobile (Expo): o login social volta para o app (`boramarcar://` ou o Expo Go).
    trustedOrigins: authTrustedOrigins(process.env),
    // nextCookies precisa ser o último plugin. O OAuth proxy permite entrar com o Google nos
    // previews da Vercel (o Google só aceita a URL de produção).
    plugins: [expo(), ...(proxy ? [oAuthProxy(proxy)] : []), nextCookies()],
  });
}

/** Sincroniza a foto do Google sem nunca impedir o login se algo der errado. */
async function syncImage(account: {
  providerId?: string | null;
  userId?: string | null;
  idToken?: string | null;
}) {
  try {
    await syncGoogleProfileImage(getDb(), account);
  } catch (error) {
    console.warn('[auth] não foi possível atualizar a foto do Google', error);
  }
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | null = null;

/** Instância preguiçosa: evita ler variáveis de ambiente durante o build. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
