import { expect, test, type Page } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_INVITE_CODE } from './support/seed';

/** Metadados de compartilhamento: toda página tem título, descrição e imagem (Open Graph). */
const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute('content');

async function expectShareable(page: Page, image: RegExp) {
  expect(await meta(page, 'og:title')).toBeTruthy();
  expect(await meta(page, 'description')).toBeTruthy();
  expect(await meta(page, 'og:description')).toBeTruthy();
  expect(await meta(page, 'og:image')).toMatch(image);
  expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
}

test.describe('metadados', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('páginas públicas e o convite com o nome do grupo', async ({ page }) => {
    await page.goto('/');
    await expectShareable(page, /\/og\/s\/home$/);
    await page.goto('/privacidade');
    await expectShareable(page, /\/og\/s\/privacy$/);
    await page.goto(`/convite/${E2E_INVITE_CODE}`);
    await expectShareable(page, new RegExp(`/og/convite/${E2E_INVITE_CODE}$`));
    expect(await meta(page, 'og:title')).toContain('Mesa de Quinta');
  });

  test('robô de prévia sem login vê a prévia da seção, sem dados do grupo', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: 'WhatsApp/2.23.20.0' });
    const page = await context.newPage();
    const response = await page.goto('/eventos');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/eventos');
    await expect(page.getByRole('heading', { level: 1, name: 'Encontros' })).toBeVisible();
    await expectShareable(page, /\/og\/s\/events$/);
    expect(await meta(page, 'og:url')).toMatch(/\/eventos$/);
    expect(await meta(page, 'robots')).toContain('noindex');
    await page.goto('/decks/e2e-deck');
    await expectShareable(page, /\/og\/(s\/deck|deck\/e2e-deck)$/);
    await context.close();
  });

  test('quem não é robô e não entrou continua indo para a home', async ({ page }) => {
    await page.goto('/eventos');
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('imagens de compartilhamento são PNG 1200×630', async ({ request }) => {
    for (const path of ['/og/s/ranking', '/og/deck/e2e-deck', `/og/convite/${E2E_INVITE_CODE}`]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    }
    expect((await request.get('/og/s/nada')).status()).toBe(404);
    expect((await request.get('/og/s/home')).status()).toBe(200);
  });

  test.describe('logado', () => {
    test.use({ storageState: AUTH_STATE });
    test('seções da área logada também têm prévia', async ({ page }) => {
      for (const [path, image] of [
        ['/painel', /\/og\/s\/dashboard$/],
        ['/ranking', /\/og\/s\/ranking$/],
        ['/decks/e2e-deck', /\/og\/(s\/deck|deck\/e2e-deck)$/],
      ] as const) {
        await page.goto(path);
        await expectShareable(page, image);
      }
    });
  });
});
