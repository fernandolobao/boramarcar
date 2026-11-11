import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

test.describe('agenda', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('grade semanal: teclado marca e desmarca o próprio horário', async ({ page }) => {
    await page.goto('/disponibilidade?semana=2031-01-06');
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();
    // Uma única parada de Tab dentro da grade
    await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);

    const first = grid.locator('button[tabindex="0"]');
    await first.focus();
    await page.keyboard.press('ArrowDown'); // 9h de segunda
    const cell = page.getByRole('button', { name: /segunda-feira, 6 de janeiro, 09h/ });
    await expect(cell).toBeFocused();
    await expect(cell).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(cell).toHaveAttribute('aria-pressed', 'true');
    await expect(cell).toHaveAccessibleName(/Você está disponível/);
    await cell.click();
    await expect(cell).toHaveAttribute('aria-pressed', 'false');
  });

  test('disponibilidade semanal aparece na grade, na lista e pode ser pulada', async ({ page }) => {
    await page.goto('/disponibilidade');
    await expect(
      page.getByRole('heading', { name: 'Minhas disponibilidades semanais' }),
    ).toBeVisible();
    await expect(page.getByText('sábado, 14:00–18:00', { exact: true })).toBeVisible();
    const skip = page.getByRole('button', { name: /^Não posso nesta data/ }).first();
    await skip.click();
    await expect(page.getByText('Datas em que não posso:')).toBeVisible();
    await page.getByRole('button', { name: /^Desfazer/ }).click();
    await expect(page.getByText('Datas em que não posso:')).toHaveCount(0);
  });

  test('membros: dono vê ações e não pode sair sem transferir', async ({ page }) => {
    await page.goto('/grupo');
    // Ações ficam recolhidas atrás de "Gerenciar", abaixo do nome.
    const manageBia = page.getByRole('button', { name: 'Gerenciar (Bia)' });
    await expect(manageBia).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('group', { name: 'Ações para Bia' })).toBeHidden();
    await manageBia.click();
    await expect(manageBia).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('group', { name: 'Ações para Bia' })).toBeVisible();

    await page.getByRole('button', { name: 'Gerenciar (Ana Teste)' }).click();
    await expect(page.getByRole('button', { name: 'Sair do grupo (Ana Teste)' })).toBeDisabled();
    await expect(
      page.getByText('Como dono(a), passe a posse para outra pessoa antes de sair.'),
    ).toBeVisible();
  });

  test('configurações: avisos por e-mail podem ser desligados e religados pelo teclado', async ({
    page,
  }) => {
    // Muda dados do usuário compartilhado: roda em um projeto só, para não disputar com o outro.
    test.skip(test.info().project.name !== 'chromium', 'só no desktop');
    await page.goto('/configuracoes');
    const toggle = page.getByRole('checkbox', { name: 'Receber avisos por e-mail' });
    await expect(toggle).toBeChecked();
    await expect(toggle).toHaveAccessibleDescription(/Novos encontros/);
    const save = async () => {
      await page.getByRole('button', { name: 'Salvar' }).click();
      // Há outra região de status na página (escolha de cookies): filtra pelo texto.
      await expect(
        page.getByRole('status').filter({ hasText: 'Preferências salvas.' }),
      ).toBeVisible();
    };

    await toggle.focus();
    await page.keyboard.press('Space');
    await save();
    await page.reload();
    await expect(toggle).not.toBeChecked();

    await toggle.check();
    await save();
    await page.reload();
    await expect(toggle).toBeChecked();
  });
});

test.describe('histórico de encontros', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('busca e filtra pela URL, com link a partir dos encontros', async ({ page }) => {
    await page.goto('/eventos');
    await page.getByRole('link', { name: 'Ver histórico completo' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Histórico de encontros' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Commander da semana passada/ })).toBeVisible();

    const search = page.getByRole('search', { name: 'Filtrar histórico' });
    await search.getByLabel('Buscar').fill('semana passada');
    await search.getByLabel('Situação').selectOption('finished');
    await search.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(/q=semana\+passada.*situacao=finished/);
    await expect(page.getByRole('heading', { name: '1 encontro' })).toBeVisible();

    await search.getByLabel('Buscar').fill('não existe');
    await search.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page.getByText('Nenhum encontro com esses filtros.')).toBeVisible();
    await page.getByRole('link', { name: 'Limpar filtros' }).click();
    await expect(page).toHaveURL(/\/eventos\/historico$/);
  });
});

test.describe('locais do grupo (2.14)', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('lista com mapa e rotas; edita o complemento', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto('/grupo');
    await expect(page.getByRole('region', { name: 'Mapa dos locais do grupo' })).toBeVisible();
    const routes = page.getByRole('list', { name: 'Abrir Casa da Ana em apps de mapa' });
    await expect(routes.getByRole('link', { name: /Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-30.0346,-51.2177',
    );
    await expect(page.getByText('Anfitrião: Ana Teste')).toBeVisible();
    await page.getByRole('button', { name: /^Editar ?\(Casa da Ana\)$/ }).click();
    const form = page.getByRole('form', { name: 'Editar Casa da Ana' });
    await form.getByLabel('Complemento').fill('Apto 42, interfone 2');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Apto 42, interfone 2')).toBeVisible();
  });
});
