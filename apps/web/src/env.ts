import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET precisa de pelo menos 32 caracteres'),
  BETTER_AUTH_URL: z.url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  VERCEL_URL: z.string().optional(),
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

/** URL base do app (BETTER_AUTH_URL, ou a URL do deploy na Vercel). */
export function getBaseUrl(env: Env = getEnv()): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
