import 'server-only';
import { consumeRateLimit, schema } from '@boramarcar/db';
import { isDomainError } from '@boramarcar/core';
import { expo } from '@better-auth/expo';
import { authTrustedOrigins, oauthProxyOptions } from './trusted-origins';
import { betterAuth } from 'better-auth';
import { oAuthProxy } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getBaseUrl, getEnv } from '@/env';
import { getDb } from './db';
import { sendResetPasswordEmail, sendVerificationEmail } from './auth-emails';
import { GOOGLE_SIGN_IN_OPTIONS, syncGoogleProfileImage } from './google-picture';
import { allowedSignUpImage, cleanUserName } from './user-fields';
import { hashedKey } from './limits';
import { track } from './activity';
import { loginPlatform } from '@boramarcar/core';

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
    // E-mail e senha, com o e-mail confirmado antes de entrar e "esqueci a senha".
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: sendResetPasswordEmail,
    },
    emailVerification: {
      sendOnSignUp: true,
      // Tentou entrar sem confirmar: manda o link de novo.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24, // 24 horas
      sendVerificationEmail,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        // Só openid, email e profile (ver google-picture.ts).
        ...GOOGLE_SIGN_IN_OPTIONS,
        scope: [...GOOGLE_SIGN_IN_OPTIONS.scope],
      },
    },
    // A rota embutida de atualizar a conta aceitaria nome e foto livres (qualquer URL, até a foto de
    // outra pessoa). O nome e a foto mudam só pelas rotas do app (`/api/v1/me/...`).
    disabledPaths: ['/update-user'],
    // Limite de tentativas no banco (o padrão fica na memória de cada instância da Vercel, que
    // reinicia e não se soma). A chave (IP + caminho) vai só como HMAC.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/*': { window: 60, max: 10 },
        '/sign-up/*': { window: 60 * 60, max: 10 },
        '/send-verification-email': { window: 5 * 60, max: 3 },
        '/request-password-reset': { window: 5 * 60, max: 3 },
        '/forget-password*': { window: 5 * 60, max: 3 },
        // Lida a cada tela: não vale gravar no banco por isso.
        '/get-session': false,
      },
      customStorage: {
        consume: async (key, rule) => {
          try {
            await consumeRateLimit(getDb(), `auth:${hashedKey(key)}`, {
              limit: rule.max,
              windowMs: rule.window * 1000,
            });
            return { allowed: true, retryAfter: null };
          } catch (error) {
            if (isDomainError(error) && error.code === 'rate_limited') {
              const retry = (error.details as { retryAfterSeconds?: number } | undefined)
                ?.retryAfterSeconds;
              return { allowed: false, retryAfter: retry ?? rule.window };
            }
            throw error;
          }
        },
      },
    },
    databaseHooks: {
      user: {
        // Cadastro (e-mail ou Google): nome limpo e só foto do Google.
        create: {
          before: async (user) => ({
            data: {
              ...user,
              name: cleanUserName(user.name),
              image: allowedSignUpImage(user.image),
            },
          }),
        },
      },
      session: {
        // Registro de atividade (Admin): cada entrada, só "site" ou "app" (sem IP nem navegador).
        create: {
          after: async (session) => {
            track({
              userId: session.userId,
              kind: 'login',
              label: loginPlatform(session.userAgent),
            });
          },
        },
      },
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
    // App mobile (Expo): o login social volta para o app (`arcanakin://` ou o Expo Go).
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
