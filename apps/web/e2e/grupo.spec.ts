import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/** Página do grupo: convite, configurações e cadastro de local em modais (a página é do grupo). */
test.describe('página do grupo', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('convite e configurações abrem em modais; Esc fecha e o foco volta ao botão', async ({
    page,
  }) => {
    await page.goto('/grupo');
    const invite = page.getByRole('button', { name: 'Convidar' });
    await invite.click();
    const dialog = page.getByRole('dialog', { name: 'Convide a galera' });
    await expect(dialog.getByRole('textbox', { name: 'Link de convite' })).toHaveValue(
      /\/convite\//,
    );
    await expect(dialog.getByTestId('invite-qr')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(invite).toBeFocused();

    await page.getByRole('button', { name: 'Configurações' }).click();
    const settings = page.getByRole('dialog', { name: 'Configurações do grupo' });
    await expect(settings.getByRole('button', { name: /Salvar/ })).toBeVisible();
    await settings.getByRole('button', { name: 'Fechar' }).click();
    await expect(settings).toBeHidden();
  });

  test('"Adicionar local" no canto da seção abre o formulário num modal, que fecha ao salvar', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
    await page.goto('/grupo');
    const section = page.getByRole('region', { name: 'Locais' });
    await section.getByRole('button', { name: 'Adicionar local' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cadastrar local' });
    const name = `Loja do Teste ${Date.now()}`;
    await dialog.getByLabel('Nome do local').fill(name);
    await dialog.getByRole('button', { name: /Salvar|Adicionar/ }).click();
    await expect(dialog).toBeHidden();
    await expect(section.getByRole('heading', { name })).toBeVisible();
  });
});
