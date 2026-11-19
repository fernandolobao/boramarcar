import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/** Descoberta de lojas e eventos por cidade (10.3): pública, sem login. */
test.describe('descoberta de lojas e eventos', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('página da cidade: eventos com agenda, lojas com distância e filtros; indexável', async ({
    page,
  }) => {
    await page.goto('/lojas/em/rs/porto-alegre');
    await expect(page.getByRole('heading', { level: 1, name: /Porto Alegre, RS/ })).toBeVisible();
    const events = page.getByRole('region', { name: 'Próximos eventos' });
    const commander = events.getByRole('link', { name: 'Commander de sexta na loja', exact: true });
    const modernCup = events.getByRole('link', { name: 'Copa de Modern da loja', exact: true });
    await expect(commander).toBeVisible();
    await expect(modernCup).toBeVisible();
    const ics = events.getByRole('link', {
      name: /Baixar para a agenda \(Commander de sexta na loja\)/,
    });
    await expect(ics).toHaveAttribute('href', /\/api\/v1\/store-events\/.+\/ics$/);
    await expect(
      events.getByRole('link', { name: /Google Agenda \(Commander de sexta na loja\)/ }),
    ).toHaveAttribute('href', /calendar\.google\.com/);
    // Filtro por formato (botão com estado).
    const modern = page.getByRole('button', { name: 'Modern', exact: true });
    await modern.click();
    await expect(modern).toHaveAttribute('aria-pressed', 'true');
    await expect(commander).toHaveCount(0);
    await expect(modernCup).toBeVisible();

    const stores = page.getByRole('region', { name: 'Lojas' });
    await expect(stores.getByRole('link', { name: 'Loja E2E' })).toBeVisible();
    await expect(
      stores
        .getByRole('listitem')
        .filter({ hasText: 'Loja E2E' })
        .getByText(/Cartas avulsas/),
    ).toBeVisible();

    // Para buscadores: sem noindex e com dados estruturados.
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('cidade sem loja própria não tem página; na busca, aparecem as lojas da vizinha', async ({
    page,
  }) => {
    const response = await page.goto('/lojas/em/rs/esteio');
    expect(response?.status()).toBe(404);
    await page.goto('/lojas');
    await page.getByRole('combobox', { name: 'Sua cidade' }).fill('Esteio');
    await page.getByRole('option', { name: 'Esteio, RS' }).click();
    await expect(page).toHaveURL(/\/lojas\?cidade=rs%2Festeio$/);
    await expect(page.getByRole('heading', { level: 1, name: /Esteio, RS/ })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Lojas' }).getByRole('link', { name: 'Loja E2E' }),
    ).toBeVisible();
    // A cidade fica guardada (só a cidade) para a próxima visita.
    await page.goto('/lojas');
    await expect(page.getByRole('heading', { level: 1, name: /Esteio, RS/ })).toBeVisible();
  });

  test('sitemap lista a página da cidade com loja', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/lojas/em/rs/porto-alegre');
    expect(xml).toContain('/lojas</loc>');
    expect(xml).not.toContain('/lojas/em/rs/esteio');
  });

  test.describe('com conta', () => {
    test.use({ storageState: AUTH_STATE });
    test('a cidade escolhida em Configurações abre "Lojas e eventos" nela', async ({ page }) => {
      test.skip(test.info().project.name !== 'chromium', 'muda dados da conta: só no desktop');
      await page.goto('/configuracoes');
      await page.getByRole('combobox', { name: 'Sua cidade' }).fill('Porto Ale');
      await page.getByRole('option', { name: 'Porto Alegre, RS' }).click();
      await page.getByRole('button', { name: 'Salvar' }).first().click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Preferências salvas.' }),
      ).toBeVisible();
      await page.goto('/lojas');
      await expect(page.getByRole('heading', { level: 1, name: /Porto Alegre, RS/ })).toBeVisible();
    });
  });
});
