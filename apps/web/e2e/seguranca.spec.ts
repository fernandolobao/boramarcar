import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/**
 * Política de segurança de conteúdo (`proxy.ts` + `lib/csp.ts`): as páginas carregam sem nenhuma
 * violação, nem da política aplicada nem da só relatada, e os cabeçalhos estão lá.
 */
const PAGES = ['/', '/privacidade', '/painel', '/decks/e2e-deck', '/grupo', '/colecao'];

test.describe('segurança', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  for (const path of PAGES) {
    test(`${path} carrega sem violar a CSP`, async ({ page }) => {
      const violations: string[] = [];
      page.on('console', (message) => {
        if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
      });
      const response = await page.goto(path);
      const headers = response!.headers();
      expect(headers['content-security-policy']).toMatch(/'nonce-[^']+'/);
      expect(headers['content-security-policy-report-only']).toContain('report-uri');
      expect(headers['x-content-type-options']).toBe('nosniff');
      await page.waitForLoadState('networkidle');
      expect(violations).toEqual([]);
    });
  }

  test('o nonce muda a cada página', async ({ request }) => {
    const a = (await request.get('/privacidade')).headers()['content-security-policy'];
    const b = (await request.get('/privacidade')).headers()['content-security-policy'];
    expect(a).not.toBe(b);
  });
});
