import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';
import { pick } from './support/select';

/** Torneios do grupo (9.1): criar num encontro, inscrever, começar, registrar e avançar. */
test.describe('torneios', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('Commander em pods: do encontro à 2ª rodada, com o vencedor na classificação', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
    await page.goto(`/eventos/${E2E_IDS.upcomingEvent}`);
    await page.getByRole('link', { name: 'Criar torneio neste encontro' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Novo torneio' })).toBeVisible();
    const name = `Copa E2E ${Date.now()}`;
    await page.getByLabel('Nome do torneio').fill(name);
    await pick(page, 'Formato', 'Commander');
    // Não mexe no ranking do grupo usado por outros testes.
    await page
      .getByRole('checkbox', { name: 'As partidas do torneio contam no ranking do grupo' })
      .uncheck({ force: true });
    await page.getByRole('button', { name: 'Criar torneio' }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

    await page.getByRole('button', { name: 'Me inscrever' }).click();
    for (const person of ['Bia', 'Caio', 'Duda']) {
      await pick(page, 'Pessoa', person);
      await page.getByRole('button', { name: 'Inscrever', exact: true }).click();
      await expect(page.getByRole('listitem').filter({ hasText: person }).first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'Começar o torneio' }).click();
    await expect(page.getByRole('heading', { name: 'Rodada 1 de 3' })).toBeVisible();

    // Um pod de 4: a Bia vence.
    await page
      .getByRole('radiogroup', { name: 'Quem venceu a mesa 1' })
      .getByText('Bia', { exact: true })
      .click();
    await page.getByRole('button', { name: /Salvar resultado/ }).click();
    // A linha da mesa (região de status) passa de "Aguardando" para quem venceu.
    await expect(
      page.getByRole('status').filter({ hasText: 'Resultado: Venceu: Bia' }),
    ).toBeVisible();
    const standings = page.getByRole('region', { name: 'Classificação' }).first();
    await expect(standings.getByRole('row').nth(1)).toContainText('Bia');

    await page.getByRole('button', { name: 'Próxima rodada' }).click();
    await expect(page.getByRole('heading', { name: 'Rodada 2 de 3' })).toBeVisible();
  });

  test('Modern em melhor de 3: placar em jogos na mesa e classificação com desempates', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    await page.goto(`/torneios/${E2E_IDS.tournament}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Copa de Modern' })).toBeVisible();
    // A mesa 2 já tem resultado; a 1 (Ana x Bia) espera.
    await expect(page.getByText('Caio: 2 · Duda: 1')).toBeVisible();
    await page.getByRole('textbox', { name: 'Jogos vencidos por Ana Teste' }).fill('2');
    await page.getByRole('textbox', { name: 'Jogos vencidos por Bia' }).fill('1');
    await page.getByRole('button', { name: /Salvar resultado/ }).click();
    await expect(page.getByText('Ana Teste: 2 · Bia: 1')).toBeVisible();
    await expect(page.getByText(/Como desempata/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Próxima rodada' })).toBeEnabled();
  });
});
