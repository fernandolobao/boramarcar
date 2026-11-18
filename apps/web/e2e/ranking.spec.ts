import { fillDate } from './support/fill-date';
import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('ranking e estatísticas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('filtra por tipo de jogo pelo formulário e mostra as estatísticas', async ({ page }) => {
    await page.goto('/ranking');
    await page.getByLabel('Tipo de jogo').selectOption({ label: 'Two-Headed Giant (2×2)' });
    await page.getByRole('button', { name: 'Filtrar' }).click();

    await expect(page).toHaveURL(/tipo=two_headed_giant/);
    await expect(
      page.getByText('Mostrando: Todas as partidas · Two-Headed Giant (2×2)'),
    ).toBeVisible();
    const standings = page.getByRole('table', { name: 'Classificação do grupo Mesa de Quinta' });
    await expect(standings.getByRole('row')).toHaveCount(5);
    await expect(standings.getByRole('row', { name: /Ana Teste/ })).toContainText('1');

    // Destaques com os detalhes registrados (turno 8, 75 min, quem começou venceu).
    await expect(page.getByText('Turno médio em que acaba')).toBeVisible();
    await expect(page.getByText('75 min')).toBeVisible();
    await expect(page.getByText('100% (1 partida)')).toBeVisible();

    // Confronto direto: Ana e Caio eram do mesmo time, então não se enfrentaram.
    const h2h = page.getByRole('table', { name: /Confronto direto/ });
    const anaRow = h2h.getByRole('row', { name: /^Ana Teste/ });
    await expect(anaRow.getByTitle(/Ana Teste contra Bia: 1 vitórias/)).toBeVisible();

    // Tabelas largas rolam e recebem foco pelo teclado.
    const region = page.getByRole('region', { name: 'Confronto direto' });
    await region.focus();
    await expect(region).toBeFocused();
  });

  test('admin cria uma temporada e ela aparece no filtro', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto('/ranking');
    await page.getByLabel('Nome').fill('Temporada E2E');
    await fillDate(page, 'Primeiro dia', '2026-01-01');
    await fillDate(page, 'Último dia', '2026-12-31');
    await page.getByRole('button', { name: 'Criar temporada' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Temporada criada.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Temporada E2E' })).toBeVisible();
    await expect(
      page.getByLabel('Período').locator('option', { hasText: 'Temporada: Temporada E2E' }),
    ).toHaveCount(1);
  });

  test('recordes do grupo: atalho na tela do grupo e os recordes com o encontro', async ({
    page,
  }) => {
    await page.goto('/grupo');
    await page.getByRole('link', { name: 'Recordes e a cara do grupo' }).click();
    await expect(page).toHaveURL(/\/grupo\/recordes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Recordes do grupo' })).toBeVisible();
    await expect(page.getByText('Noite com mais partidas')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'A cara do grupo' })).toBeVisible();
  });

  test('retrospectiva do mês: pública, só primeiros nomes e com compartilhar', async ({
    browser,
  }) => {
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
    })
      .format(new Date(Date.now() - 7 * 86_400_000))
      .slice(0, 7);
    // Sem login: a página é pública para quem tem o link.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`/retrospectiva/${E2E_IDS.group}/${month}`);
    await expect(page.getByText('Retrospectiva do mês')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Compartilhar' })).toBeVisible();
    // Nada de e-mail nem nome do grupo no conteúdo da página.
    const main = page.locator('main');
    await expect(main).not.toContainText('@e2e.test');
    await expect(main).not.toContainText('Mesa de Quinta');
    await expect(page.getByRole('link', { name: 'Conhecer o ArcanaKin' })).toBeVisible();
    // Mês inválido: página não encontrada.
    const missing = await page.goto(`/retrospectiva/${E2E_IDS.group}/2026-13`);
    expect(missing?.status()).toBe(404);
    await context.close();
  });
});
