import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

/** Torneio público (9.5): quem tem o link acompanha sem entrar, só com primeiros nomes. */
test.describe('torneio público', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('sem login: ao vivo, mesas e classificação, sem sobrenome nem e-mail', async ({ page }) => {
    await page.goto(`/torneio/${E2E_IDS.tournament}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Copa de Modern' })).toBeVisible();
    await expect(page.getByText('Ao vivo', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Classificação' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Ana');
    await expect(page.locator('main')).not.toContainText('Teste');
    await expect(page.locator('main')).not.toContainText('@');
    // Visitante não registra resultado nem organiza.
    await expect(page.getByRole('button', { name: /Salvar resultado/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Próxima rodada/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Conhecer o ArcanaKin' })).toBeVisible();
  });

  test('torneio que não existe dá 404', async ({ page }) => {
    const response = await page.goto('/torneio/nao-existe');
    expect(response?.status()).toBe(404);
  });

  test.describe('quem é do grupo', () => {
    test.use({ storageState: AUTH_STATE });
    test('a página do torneio mostra o link público para compartilhar', async ({ page }) => {
      await page.goto(`/torneios/${E2E_IDS.tournament}`);
      const link = page.getByRole('region', { name: 'Link público' });
      await expect(link.getByRole('textbox', { name: 'Link público' })).toHaveValue(
        new RegExp(`/torneio/${E2E_IDS.tournament}$`),
      );
    });
  });
});
