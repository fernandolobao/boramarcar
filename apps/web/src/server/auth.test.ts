import { createTestDb } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { dbMock, testState } from '@/test/api';

vi.mock('@/server/db', () => dbMock);
// Sem e-mail de verdade: só registra que o link seria enviado.
vi.mock('./auth-emails', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendResetPasswordEmail: vi.fn(async () => {}),
}));

const { getAuth } = await import('./auth');

const base = 'http://localhost:3000/api/auth';
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  getAuth().handler(
    new Request(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...headers },
      body: JSON.stringify(body),
    }),
  );

describe('login (Better Auth): o que quem usa pode gravar na própria conta', () => {
  let close: () => Promise<void>;
  beforeAll(async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
    const t = await createTestDb();
    testState.db = t.db;
    close = t.close;
  });
  afterAll(async () => {
    await close();
    vi.unstubAllEnvs();
  });

  it('a rota embutida de atualizar a conta (nome e foto livres) não existe', async () => {
    const res = await post('/update-user', {
      image: 'https://x.public.blob.vercel-storage.com/avatars/outra-pessoa/f.webp',
    });
    expect(res.status).toBe(404);
  });

  it('cadastro: foto de fora vira nenhuma, nome é aparado e limitado', async () => {
    const res = await post('/sign-up/email', {
      email: 'nova@example.com',
      password: 'senha-forte-123',
      name: `  ${'Ana'.repeat(100)}\u0007 `,
      image: 'https://rastreador.example/pixel.gif',
    });
    expect(res.status).toBe(200);
    const row = await testState.db!.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, 'nova@example.com'),
    });
    expect(row!.image).toBeNull();
    expect(row!.name.length).toBeLessThanOrEqual(80);
    expect(row!.name.startsWith('AnaAna')).toBe(true);
    expect(row!.name).not.toMatch(/\p{Cc}/u);
  });
});
