import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

/** Resumo da noite (8.6): público para quem tem o link, só com primeiros nomes e placar. */
test.describe('resumo do encontro', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('sem login: placar, partidas, compartilhar e prévia do link', async ({ page }) => {
    await page.goto(`/resumo/${E2E_IDS.pastEvent}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Commander da semana passada' }),
    ).toBeVisible();
    const standings = page.getByRole('region', { name: 'Placar da noite' });
    await expect(standings.getByText('Ana', { exact: true })).toBeVisible();
    // Nada de sobrenome, e-mail ou local.
    await expect(page.locator('main')).not.toContainText('Teste');
    await expect(page.locator('main')).not.toContainText('@');
    await expect(page.getByRole('heading', { name: 'Partida 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Conhecer o ArcanaKin' })).toBeVisible();
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(new RegExp(`/og/resumo/${E2E_IDS.pastEvent}$`));
    expect((await page.request.get(`/og/resumo/${E2E_IDS.pastEvent}`)).status()).toBe(200);
  });

  test('encontro que não acabou não tem resumo', async ({ page }) => {
    const response = await page.goto(`/resumo/${E2E_IDS.upcomingEvent}`);
    expect(response?.status()).toBe(404);
  });

  test.describe('logado', () => {
    test.use({ storageState: AUTH_STATE });
    test('o encontro finalizado leva ao resumo', async ({ page }) => {
      await page.goto(`/eventos/${E2E_IDS.pastEvent}`);
      await page.getByRole('link', { name: 'Resumo para compartilhar' }).click();
      await expect(page).toHaveURL(new RegExp(`/resumo/${E2E_IDS.pastEvent}$`));
      await expect(page.getByRole('link', { name: 'Abrir o encontro' })).toBeVisible();
    });
  });
});
