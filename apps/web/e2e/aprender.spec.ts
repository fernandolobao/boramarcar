import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

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
    await page.getByRole('link', { name: /Próxima: O que é Commander/ }).click();
    await expect(page.getByText(/Commander para iniciantes · Lição 1 de 4/)).toBeVisible();
    expect((await page.goto('/aprender/nao-existe'))?.status()).toBe(404);
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
