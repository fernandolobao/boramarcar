import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

test.describe('cabeçalho', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('grupo abaixo da marca, navegação numa linha e menu da conta pelo teclado', async ({
    page,
  }) => {
    await page.goto('/painel');
    const brand = page.getByRole('link', { name: /Bora Marcar.*Mesa de Quinta/ });
    await expect(brand).toBeVisible();
    // Sem rolagem horizontal da página, em qualquer largura do projeto.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav.getByRole('link', { name: 'Perfil' })).toHaveCount(0);

    const menu = page.getByRole('button', { name: /Ana.*Menu da conta/ });
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('ana@e2e.test')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();

    await menu.click();
    await page.getByRole('link', { name: 'Configurações' }).click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    await menu.click();
    await page.getByRole('link', { name: 'Perfil' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Teste' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conquistas' })).toBeVisible();
  });

  test('em inglês o cabeçalho continua sem quebrar', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'en', url: test.info().project.use.baseURL! },
    ]);
    await page.goto('/grupo');
    await expect(page.getByRole('link', { name: 'Availability' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    // A linha da marca e o menu ficam na mesma altura (nada empurrado para baixo).
    const brand = await page
      .getByRole('link', { name: /Bora Marcar/ })
      .first()
      .boundingBox();
    const menu = await page.getByRole('button', { name: /Account menu/ }).boundingBox();
    expect(Math.abs(brand!.y + brand!.height / 2 - (menu!.y + menu!.height / 2))).toBeLessThan(12);
  });
});
