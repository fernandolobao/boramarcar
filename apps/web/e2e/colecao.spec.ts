import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('coleção', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('nasce dos decks sem proxies, filtra, mostra os decks e o valor', async ({ page }) => {
    await page.goto('/painel');
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Coleção' })
      .click();
    await expect(page).toHaveURL(/\/colecao$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Coleção' })).toBeVisible();

    // Omnath, Cultivate e 36 Forests; o Sol Ring do deck é proxy e não entra.
    await expect(page.getByRole('button', { name: /^Ver e editar Cultivate/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ver e editar Sol Ring/ })).toHaveCount(0);
    await expect(page.getByTestId('collection-value')).toContainText(/0[.,]30/);

    await page.getByLabel('Nome ou tipo').fill('sorcery');
    await expect(page.getByText(/^1 linha de 3/)).toBeVisible();
    await page.getByRole('button', { name: 'Lista' }).click();
    const row = page.getByRole('row').filter({ hasText: 'Cultivate' });
    await expect(row).toContainText('M21 #178');
    await expect(row).toContainText('Anthony Palumbo');
    await expect(row).toContainText('2020');

    await row.getByRole('button', { name: 'Cultivate' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cultivate' });
    await expect(dialog.getByRole('link', { name: /Omnath Ramp: 1 cópia/ })).toHaveAttribute(
      'href',
      `/decks/${E2E_IDS.deck}`,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
