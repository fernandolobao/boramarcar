import { fillDate } from './support/fill-date';
import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { monthlyKey } from './support/monthly-key';
import { E2E_IDS } from './support/seed';
import { pick } from './support/select';

test.describe('ranking e estatísticas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('filtra por tipo de jogo pelo formulário e mostra as estatísticas', async ({ page }) => {
    await page.goto('/ranking');
    await pick(page, 'Tipo de jogo', 'Two-Headed Giant (2×2)');
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

  test('o ⓘ do título explica os pontos e o desempate', async ({ page }) => {
    await page.goto('/ranking');
    const toggle = page.getByRole('button', { name: 'Dica sobre esta tela' });
    // Na primeira visita a dica já vem aberta; fecha e abre pelo botão.
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    const tip = page.getByRole('region', { name: 'Dica' });
    await expect(tip).toContainText('mais vitórias');
    await expect(tip).toContainText('menos partidas');
    await toggle.click();
    await expect(tip).toBeHidden();
  });

  test('admin cria uma temporada e ela aparece no filtro', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto('/ranking');
    await page.getByText('Nova temporada').click();
    await page.getByLabel('Nome').fill('Temporada E2E');
    await fillDate(page, 'Primeiro dia', '2026-01-01');
    await fillDate(page, 'Último dia', '2026-12-31');
    await page.getByRole('button', { name: 'Criar temporada' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Temporada criada.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Temporada E2E' })).toBeVisible();
    // A temporada nova aparece como opção do filtro de período.
    await page.getByRole('button', { name: /(^|\s)Período$/ }).click();
    await expect(
      page.getByRole('listbox').getByRole('option', { name: 'Temporada: Temporada E2E' }),
    ).toHaveCount(1);
    await page.keyboard.press('Escape');
  });

  test('recordes do grupo: na própria tela do grupo; o endereço antigo leva até eles', async ({
    page,
  }) => {
    await page.goto('/grupo');
    await expect(page.getByRole('heading', { level: 2, name: 'Recordes' })).toBeVisible();
    await expect(page.getByText('Noite com mais partidas')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'A cara do grupo' })).toBeVisible();
    await page.goto('/grupo/recordes');
    await expect(page).toHaveURL(/\/grupo#recordes$/);
  });

  test('retrospectiva do mês: pelo link com o código, só primeiros nomes e com compartilhar', async ({
    browser,
  }) => {
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
    })
      .format(new Date(Date.now() - 7 * 86_400_000))
      .slice(0, 7);
    // Sem login: abre só com o código daquele mês no link.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const semCodigo = await page.goto(`/retrospectiva/${E2E_IDS.group}/${month}`);
    expect(semCodigo?.status()).toBe(404);
    await page.goto(
      `/retrospectiva/${E2E_IDS.group}/${month}?k=${monthlyKey(E2E_IDS.group, month)}`,
    );
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
