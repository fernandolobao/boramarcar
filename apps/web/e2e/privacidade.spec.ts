import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

test('política de privacidade é pública, com índice e contato', async ({ page }) => {
  await page.goto('/privacidade');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '8. Os seus direitos' }).click();
  await expect(page).toHaveURL(/#direitos$/);
  await expect(page.getByRole('heading', { name: '8. Os seus direitos' })).toBeInViewport();
  await expect(page.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/);
});

test.describe('privacidade e dados', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('Configurações: baixar meus dados, escolha de cookies e excluir conta', async ({ page }) => {
    await page.goto('/configuracoes');
    const section = page.getByRole('region', { name: 'Privacidade e dados' });
    await expect(section.getByRole('link', { name: 'Baixar meus dados' })).toBeVisible();
    await expect(section.getByRole('button', { name: 'Excluir minha conta' })).toBeVisible();
    await section.getByRole('radio', { name: 'Não permitir' }).check();
    await expect(section.getByText('Escolha salva.')).toBeVisible();

    const download = page.waitForEvent('download');
    await section.getByRole('link', { name: 'Baixar meus dados' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^arcanakin-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);

    // Link da política no rodapé do app.
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Política de Privacidade' })
      .click();
    await expect(page).toHaveURL(/\/privacidade$/);
  });
});
