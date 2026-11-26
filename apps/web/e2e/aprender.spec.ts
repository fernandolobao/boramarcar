import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_INVITE_CODE } from './support/seed';

test.describe('aprender a jogar (12.1)', () => {
  test('sem conta: trilha aberta, lição com símbolos de mana e convite para entrar', async ({
    page,
  }) => {
    await page.goto('/aprender');
    await expect(page.getByRole('heading', { level: 1, name: 'Aprender a jogar' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lição 3 de 7: Mana e terrenos/ })).toBeVisible();
    await page.getByRole('link', { name: 'Começar a trilha' }).click();
    await expect(page).toHaveURL(/\/aprender\/o-que-e-magic$/);
    await page.getByRole('link', { name: /Próxima: Tipos de carta/ }).click();
    await page.getByRole('link', { name: /Próxima: Mana e terrenos/ }).click();
    // {G} vira símbolo com o nome por extenso para leitores de tela.
    await expect(page.locator('main .ms-g').first()).toBeAttached();
    await expect(
      page.getByRole('link', { name: 'Entre para salvar o seu progresso' }),
    ).toHaveAttribute('href', '/entrar?para=/aprender/mana-e-terrenos');
    // Commander para iniciantes (12.2): bloco próprio, numeração do bloco, e o básico leva a ele.
    await page.goto('/aprender');
    const commander = page.getByRole('region', { name: 'Commander para iniciantes' });
    await expect(
      commander.getByRole('link', { name: /Lição 2 de 4: Identidade de cor/ }),
    ).toBeVisible();
    await page.goto('/aprender/como-se-vence');
    // Última lição da trilha básica: convite para praticar na mesa de testes.
    await expect(page.getByRole('region', { name: 'Pratique sozinho' })).toBeVisible();
    await page.getByRole('link', { name: /Próxima: O que é Commander/ }).click();
    await expect(page.getByRole('region', { name: 'Pratique sozinho' })).toHaveCount(0);
    await expect(page.getByText(/Commander para iniciantes · Lição 1 de 4/)).toBeVisible();
    expect((await page.goto('/aprender/nao-existe'))?.status()).toBe(404);
  });

  test('glossário: busca sem acento e pelo nome em inglês', async ({ page }) => {
    await page.goto('/aprender');
    await page.getByRole('link', { name: 'Glossário', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Glossário' })).toBeVisible();
    const search = page.getByLabel('Buscar no glossário (em português ou inglês)');
    await search.fill('trample');
    await expect(page.getByRole('status').filter({ hasText: '1 termo' })).toBeVisible();
    await expect(page.getByRole('term')).toHaveText(/Atropelar\s*\(Trample\)/);
    await search.fill('impeto');
    await expect(page.getByRole('term').first()).toContainText('Ímpeto');
  });

  test('desafios: a mesa, a pergunta e a resposta comentada (12.4)', async ({ page }) => {
    await page.goto('/aprender');
    const block = page.getByRole('region', { name: 'Desafios' });
    await block.getByRole('link', { name: /Desafio 1 de 7: Um anjo no ar/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Um anjo no ar' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Oponente' })).toContainText('Serra Angel');
    await page.getByRole('radio', { name: 'Bloqueio com Grizzly Bears.' }).check({ force: true });
    await page.getByRole('button', { name: 'Responder' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ainda não.' })).toBeVisible();
    await page
      .getByRole('radio', { name: 'Não bloqueio e perco 4 de vida.' })
      .check({ force: true });
    await page.getByRole('button', { name: 'Responder' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Certo!' })).toBeVisible();
    await page.getByRole('link', { name: /Próxima: Raio nos Ursos/ }).click();
    await expect(page).toHaveURL(/desafio-pilha$/);
  });

  test('o convite do grupo oferece a trilha (12.5)', async ({ page }) => {
    await page.goto(`/convite/${E2E_INVITE_CODE}`);
    const block = page.getByRole('region', { name: 'Nunca jogou Magic?' });
    await block.getByRole('link', { name: 'Aprender a jogar' }).click();
    await expect(page).toHaveURL(/\/aprender$/);
  });

  test.describe('com conta', () => {
    test.use({ storageState: AUTH_STATE });

    test('concluir uma lição salva o progresso', async ({ page }) => {
      test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
      await page.goto('/aprender/a-pilha');
      const toggle = page.getByRole('button', { name: /Marcar como concluída|Concluída/ });
      if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click();
      await page.getByRole('button', { name: 'Marcar como concluída' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Lição concluída.' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Concluída' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.goto('/aprender');
      await expect(page.getByText(/de 11 lições concluídas/)).toBeVisible();
      await expect(page.getByRole('link', { name: /A pilha e as respostas/ })).toContainText(
        'Concluída',
      );
      // Depois de passear pelas lições, "Voltar" leva ao painel, não à última lição aberta.
      await page.getByRole('link', { name: 'Voltar', exact: true }).click();
      await expect(page).toHaveURL(/\/painel$/);
    });
  });
});
