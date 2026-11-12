import { expect, test } from '@playwright/test';
import { E2E_INVITE_CODE } from './support/seed';

/** Onboarding (Fase 7): o convite mostra o grupo antes de entrar. */
test.describe('onboarding', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('convite mostra quem já está, o próximo encontro e como funciona', async ({ page }) => {
    await page.goto(`/convite/${E2E_INVITE_CODE}`);
    await expect(page.getByRole('heading', { level: 1, name: /Mesa de Quinta/ })).toBeVisible();
    const who = page.getByText(/^Quem já está:/);
    await expect(who).toBeVisible();
    for (const name of ['Ana', 'Bia', 'Caio', 'Duda']) await expect(who).toContainText(name);
    await expect(page.getByText(/Próximo encontro: |Ainda não há encontro marcado/)).toBeVisible();
    const how = page.getByRole('heading', { name: 'Como funciona' });
    await expect(how).toBeVisible();
    // Nada de e-mail de ninguém numa página que circula por link.
    await expect(page.locator('body')).not.toContainText('@e2e.test');
  });
});
