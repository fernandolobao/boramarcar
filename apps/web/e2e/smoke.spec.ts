import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('página inicial apresenta o app e o login com Google', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ArcanaKin/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google/ }).first()).toBeVisible();
    // Menu superior leva à tela de entrada (Google ou e-mail e senha); o topo oferece criar conta.
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Entrar no painel' }),
    ).toHaveAttribute('href', '/entrar');
    await expect(
      page.getByRole('link', { name: 'Criar conta com e-mail' }).first(),
    ).toHaveAttribute('href', '/cadastro');
    for (const section of [
      'Funcionalidades',
      'Veja por dentro',
      'De onde vêm as informações',
      'Como avaliamos e sugerimos',
      'No que a gente acredita',
      'Participe dos testes',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Enviar feedback por e-mail' })).toHaveAttribute(
      'href',
      /^mailto:contato@arcanakin\.com\.br\?subject=/,
    );
    // Sem vídeo no topo: a prévia do app é lida como uma imagem só.
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /Exemplo do ArcanaKin/ })).toBeVisible();
  });

  test('navegador em inglês no Brasil abre em português; o seletor troca e lembra', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8' },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    const languages = page.getByRole('banner').getByRole('group', { name: 'Idioma' });
    await expect(languages.getByRole('button', { name: /^PT/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await languages.getByRole('button', { name: /^EN/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 2, name: 'Features' })).toBeVisible();
    // A escolha fica no cookie: a próxima visita já vem em inglês.
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await context.close();
  });

  test('áreas logadas levam visitantes para a tela de entrada (e voltam depois)', async ({
    page,
  }) => {
    for (const path of [
      '/painel',
      '/disponibilidade',
      '/ranking',
      '/decks',
      '/perfil',
      '/configuracoes',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/entrar\\?para=${encodeURIComponent(path)}$`));
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
