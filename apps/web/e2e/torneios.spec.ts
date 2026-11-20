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

    // Rodada 2 pelo modo mesa: jogadores e formato vêm do torneio; o resultado volta para a mesa.
    const url = page.url();
    await page.getByRole('link', { name: /Abrir no modo mesa/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Modo mesa' })).toBeVisible();
    await expect(
      page.getByText(/mesa 1: os jogadores e o formato já vêm do torneio/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Começar' }).click();
    await page.getByRole('button', { name: 'Menu da mesa' }).click();
    await page.getByRole('button', { name: 'Encerrar e registrar' }).click();
    await page.getByRole('radio', { name: /Caio/ }).check({ force: true });
    await page.getByRole('button', { name: 'Salvar partida' }).click();
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole('status').filter({ hasText: 'Resultado: Venceu: Caio' }),
    ).toBeVisible();
  });

  test('top cut na criação: tamanhos do um contra um e dos pods, com a explicação', async ({
    page,
  }) => {
    await page.goto(`/eventos/${E2E_IDS.upcomingEvent}`);
    await page.getByRole('link', { name: 'Criar torneio neste encontro' }).click();
    await pick(page, 'Formato', 'Modern');
    await page.getByRole('button', { name: /Top cut/ }).click();
    await expect(page.getByRole('option')).toHaveText([
      'Sem top cut (só o suíço)',
      'Top 4',
      'Top 8',
    ]);
    // Fecha escolhendo (como uma pessoa faria; no celular a lista cobre a tela).
    await page.getByRole('option', { name: 'Top 8', exact: true }).click();
    await expect(page.getByText(/eliminação simples: 1º contra o último do top/)).toBeVisible();
    await pick(page, 'Formato', 'Commander');
    await page.getByRole('button', { name: /Top cut/ }).click();
    await expect(page.getByRole('option')).toHaveText([
      'Sem top cut (só o suíço)',
      'Top 4',
      'Top 10',
      'Top 16',
    ]);
    await page.getByRole('option', { name: 'Top 10', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Top 10 Top cut/ })).toBeVisible();
  });

  test('estrutura na criação: só no um contra um; fora do suíço some o número de rodadas e o top', async ({
    page,
  }) => {
    await page.goto(`/eventos/${E2E_IDS.upcomingEvent}`);
    await page.getByRole('link', { name: 'Criar torneio neste encontro' }).click();
    await pick(page, 'Formato', 'Commander');
    await expect(page.getByRole('button', { name: /Estrutura$/ })).toHaveCount(0);
    await pick(page, 'Formato', 'Modern');
    await expect(page.getByRole('textbox', { name: 'Rodadas' })).toBeVisible();
    await pick(page, 'Estrutura', 'Eliminação simples');
    await expect(page.getByText(/Chave sorteada: quem perde sai/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Rodadas' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Top cut$/ })).toHaveCount(0);
    await pick(page, 'Estrutura', 'Eliminação dupla');
    await expect(page.getByText(/cai para a chave dos perdedores/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Rodadas' })).toHaveCount(0);
    await pick(page, 'Estrutura', 'Todos contra todos');
    await expect(page.getByText(/enfrenta todas as outras uma vez/)).toBeVisible();
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
