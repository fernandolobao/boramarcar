import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

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
    await page.getByLabel('Primeiro dia').fill('2026-01-01');
    await page.getByLabel('Último dia').fill('2026-12-31');
    await page.getByRole('button', { name: 'Criar temporada' }).click();
    await expect(page.getByRole('status')).toHaveText('Temporada criada.');
    await expect(page.getByRole('link', { name: 'Temporada E2E' })).toBeVisible();
    await expect(
      page.getByLabel('Período').locator('option', { hasText: 'Temporada: Temporada E2E' }),
    ).toHaveCount(1);
  });
});
