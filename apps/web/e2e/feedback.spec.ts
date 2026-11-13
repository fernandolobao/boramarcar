import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/** Feedback do beta (8.4): pelo menu da conta, com a página de origem. */
test.describe('feedback', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('envia feedback a partir do menu da conta', async ({ page }) => {
    await page.goto('/ranking');
    await page.getByRole('button', { name: /Menu da conta/ }).click();
    // O do menu (o rodapé também tem um link, sem a página de origem).
    await page.locator('a[href^="/feedback?de="]').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Enviar feedback' })).toBeVisible();
    await expect(page.getByText('Enviado a partir de: /ranking')).toBeVisible();
    await page.getByLabel('Ideia ou sugestão').check();
    await page.getByLabel('Mensagem').fill('Seria ótimo ver o ranking por temporada no celular.');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByText('Obrigado! Recebemos o seu feedback.')).toBeFocused();
  });

  test('métricas do beta e feedback recente para quem está em ADMIN_EMAILS', async ({ page }) => {
    await page.goto('/painel');
    await page.getByRole('button', { name: /Menu da conta/ }).click();
    await page.getByRole('link', { name: 'Métricas do beta' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Métricas do beta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Métrica norte' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feedback recente' })).toBeVisible();
    // Lista de contas, com busca por nome ou e-mail.
    const accounts = page.getByRole('region', { name: 'Contas' });
    await accounts.getByLabel('Buscar por nome ou e-mail').fill('bia@e2e');
    await expect(accounts.getByText('bia@e2e.test')).toBeVisible();
    await expect(accounts.getByText('ana@e2e.test')).toHaveCount(0);
  });
});
