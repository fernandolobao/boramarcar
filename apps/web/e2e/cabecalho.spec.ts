import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

test.describe('cabeçalho', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('grupo abaixo da marca, navegação numa linha e menu da conta pelo teclado', async ({
    page,
  }) => {
    await page.goto('/painel');
    const brand = page.getByRole('link', { name: /ArcanaKin.*Mesa de Quinta/ });
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
      .getByRole('link', { name: /ArcanaKin/ })
      .first()
      .boundingBox();
    const menu = await page.getByRole('button', { name: /Account menu/ }).boundingBox();
    expect(Math.abs(brand!.y + brand!.height / 2 - (menu!.y + menu!.height / 2))).toBeLessThan(12);
  });

  test('o menu da conta fica por cima do conteúdo da página (ex.: imagem do deck)', async ({
    page,
  }) => {
    await page.goto('/decks/e2e-deck');
    await page.getByRole('button', { name: /Menu da conta/ }).click();
    const item = page.getByRole('link', { name: 'Configurações' });
    await expect(item).toBeVisible();
    // O elemento no ponto central do item precisa ser o próprio item (nada por cima).
    const box = (await item.boundingBox())!;
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.closest('a')?.getAttribute('href'),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(onTop).toBe('/configuracoes');
    await item.click();
    await expect(page).toHaveURL(/\/configuracoes$/);
  });
});

test.describe('tema', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE, colorScheme: 'light' });

  test('escolher Escuro em Configurações vale em todas as páginas e após recarregar', async ({
    page,
  }) => {
    await page.goto('/configuracoes');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const light = await bg();
    await page.getByRole('radio', { name: 'Escuro' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await bg()).not.toBe(light);
    await page.goto('/painel');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/configuracoes');
    await expect(page.getByRole('radio', { name: 'Escuro' })).toBeChecked();
    await page.getByRole('radio', { name: 'Automático' }).check();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });
});

test.describe('página inicial com sessão', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE, reducedMotion: 'reduce' });

  test('fica na página inicial, com botão para o painel; sem animação com "reduzir movimento"', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Reproduzir animação de fundo' })).toBeVisible();
    expect(await page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByRole('banner').getByRole('link', { name: 'Ir para o painel' }).click();
    await expect(page).toHaveURL(/\/painel$/);
  });
});
