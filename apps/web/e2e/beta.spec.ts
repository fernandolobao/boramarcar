import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/** Beta assistido (8.5): quem administra decide quando começa; o grupo vê a faixa no painel. */
test.describe('beta assistido', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('marcar data, começar agora, ver a faixa no painel, dispensar e encerrar', async ({
    page,
  }) => {
    // Dispensar a faixa fica guardado no servidor: roda uma vez só.
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto('/admin');
    const beta = page.getByRole('region', { name: 'Beta assistido' });
    const groups = beta.getByRole('group', { name: 'Grupos do beta' });
    await groups
      .getByRole('checkbox', { name: /Mesa de Quinta/ })
      .first()
      .check();

    // Data no futuro: fica marcado e nada muda para o grupo.
    await beta.getByLabel('Data de início').fill('2099-01-04');
    await beta.getByRole('button', { name: 'Salvar' }).click();
    await expect(beta.getByText('Beta salvo.')).toBeFocused();
    await expect(page.getByTestId('beta-status')).toContainText('Começa em');
    await page.goto('/painel');
    await expect(page.getByRole('region', { name: /está no beta/ })).toHaveCount(0);

    await page.goto('/admin');
    await page
      .getByRole('region', { name: 'Beta assistido' })
      .getByRole('button', { name: 'Começar agora' })
      .click();
    await expect(page.getByTestId('beta-status')).toContainText('semana 1 de 8');
    await expect(page.getByRole('table', { name: 'Grupos do beta desde o início' })).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    await page.goto('/painel');
    const banner = page.getByRole('region', { name: /está no beta/ });
    await expect(banner).toContainText('Semana 1 de 8');
    await expect(banner.getByRole('link', { name: 'Enviar feedback' })).toHaveAttribute(
      'href',
      '/feedback?de=/painel',
    );
    await banner.getByRole('button', { name: 'Dispensar o aviso do beta' }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('region', { name: /está no beta/ })).toHaveCount(0);

    await page.goto('/admin');
    const end = page
      .getByRole('region', { name: 'Beta assistido' })
      .getByRole('button', { name: /Encerrar beta|Confirmar/ });
    await end.click();
    await end.click();
    await expect(page.getByTestId('beta-status')).toContainText('Encerrado');
  });
});
