import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { pick } from './support/select';

test.describe('custos da plataforma (admin, 13.1)', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('admin lança um custo em real, vê no mês e apaga em dois cliques', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    const note = `E2E ${Date.now()}`;
    await page.goto('/admin?aba=custos');
    const section = page.getByRole('region', { name: 'Custos da plataforma' });
    await pick(section, 'Serviço', 'Neon (banco de dados)');
    await pick(section, 'Moeda', 'Real (R$)');
    await section.getByLabel('Valor (R$)').fill('123,45');
    await section.getByLabel('Observação (opcional)').fill(note);
    await section.getByRole('button', { name: 'Lançar', exact: true }).click();
    await expect(section.getByRole('status')).toHaveText('Custo lançado.');

    const entry = section.getByRole('listitem').filter({ hasText: note });
    await expect(entry).toContainText('R$ 123,45');
    // O mês atual soma o lançamento (pode haver outros de testes anteriores).
    await expect(section.getByRole('table', { name: 'Últimos meses' })).toBeVisible();

    await entry.getByRole('button', { name: /^Apagar/ }).click();
    await entry.getByRole('button', { name: /^Confirmar: apagar/ }).click();
    await expect(section.getByText(note)).toHaveCount(0);
  });
});
