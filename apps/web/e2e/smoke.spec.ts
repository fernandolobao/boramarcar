import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('página inicial apresenta o app e o login com Google', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ArcanaKin/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google/ }).first()).toBeVisible();
    // Menu superior leva ao painel (entrando com o Google).
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Entrar no painel' }),
    ).toBeVisible();
    for (const section of [
      'Funcionalidades',
      'De onde vêm as informações',
      'Como avaliamos e sugerimos',
      'Nossos valores',
      'Participe dos testes',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Enviar feedback por e-mail' })).toHaveAttribute(
      'href',
      /^mailto:fernando@fernandocamilotti\.com\?subject=/,
    );
    await expect(
      page
        .getByRole('button', { name: 'Pausar animação de fundo' })
        .or(page.getByRole('button', { name: 'Reproduzir animação de fundo' })),
    ).toBeVisible();
  });

  test('áreas logadas redirecionam visitantes para a página inicial', async ({ page }) => {
    for (const path of [
      '/painel',
      '/disponibilidade',
      '/ranking',
      '/decks',
      '/perfil',
      '/configuracoes',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('API exige autenticação e health check responde', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.ok()).toBe(true);
    expect(await health.json()).toMatchObject({ status: 'ok' });

    const groups = await request.get('/api/v1/groups');
    expect(groups.status()).toBe(401);
    expect(await groups.json()).toMatchObject({ error: { code: 'unauthorized' } });
  });

  test('idioma segue o Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in with Google' }).first()).toBeVisible();
    await context.close();
  });
});

test('desliga a detecção automática de links do iOS (nomes, datas, endereços)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
    'content',
    /address=no/,
  );
});
