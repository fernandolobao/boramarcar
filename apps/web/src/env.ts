import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET precisa de pelo menos 32 caracteres'),
  BETTER_AUTH_URL: z.url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  VERCEL_URL: z.string().optional(),
  /** User-Agent autorizado pelo Moxfield (opcional; sem ele a API costuma recusar). */
  MOXFIELD_USER_AGENT: z.string().min(1).optional(),
  /** Chave da API do Resend (opcional; sem ela os e-mails são apenas registrados no log). */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Remetente dos e-mails. Sem domínio verificado no Resend, use o de testes. */
  EMAIL_FROM: z.string().min(3).default('ArcanaKin <onboarding@resend.dev>'),
  /** Segredo que a Vercel envia no header Authorization ao chamar os cron jobs. */
  CRON_SECRET: z.string().min(16).optional(),
  /** Token de acesso do Expo para o envio de push (opcional; só se a segurança extra estiver ligada no Expo). */
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  /** `off` desliga o envio de notificações push. */
  PUSH_NOTIFICATIONS: z.enum(['on', 'off']).default('on'),
  /** E-mails de quem administra o projeto (separados por vírgula): recebem o feedback do beta. */
  ADMIN_EMAILS: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Lê e valida as variáveis de ambiente do servidor na primeira utilização.
 * `SKIP_ENV_VALIDATION=1` permite builds/testes sem segredos reais.
 */
export function getEnv(): Env {
  if (cached) return cached;
  if (process.env.SKIP_ENV_VALIDATION) {
    cached = {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/boramarcar',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'x'.repeat(32),
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? 'missing',
      VERCEL_URL: process.env.VERCEL_URL,
      MOXFIELD_USER_AGENT: process.env.MOXFIELD_USER_AGENT,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM ?? 'ArcanaKin <onboarding@resend.dev>',
      CRON_SECRET: process.env.CRON_SECRET,
      EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
      PUSH_NOTIFICATIONS: process.env.PUSH_NOTIFICATIONS === 'off' ? 'off' : 'on',
      ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    };
    return cached;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Só para testes: descarta o cache para reler `process.env`. */
export function resetEnvCache() {
  cached = null;
}

/** URL base do app (BETTER_AUTH_URL, ou a URL do deploy na Vercel). */
export function getBaseUrl(env: Env = getEnv()): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** E-mails de administração (`ADMIN_EMAILS`), em minúsculas, sem vazios. */
export function adminEmails(env: Env = getEnv()): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}
