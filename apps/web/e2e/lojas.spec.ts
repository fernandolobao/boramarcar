import { createDb } from '@boramarcar/db';
import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

/** Perfis de loja (10.1): o admin cria, a dona aceita o convite, edita e vê o perfil público. */
test.describe('lojas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test.describe('logado', () => {
    test.use({ storageState: AUTH_STATE });

    test('admin cria a loja; a dona aceita o convite, edita o perfil e vê a página pública', async ({
      page,
    }) => {
      test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
      const name = `Loja Nova ${Date.now()}`;
      await page.goto('/admin');
      const section = page.getByRole('region', { name: 'Lojas' });
      await section.getByLabel('Nome da loja').fill(name);
      await section.getByLabel('Cidade').fill('Canoas');
      await section.getByLabel('E-mail do responsável').fill('ana@e2e.test');
      await section.getByRole('button', { name: 'Criar loja e enviar convite' }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'O convite foi enviado para ana@e2e.test' }),
      ).toBeVisible();

      // O e-mail não sai no E2E: o link do convite vem do banco.
      const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
      const { rows } = await pool.query(
        `select i.token from store_invites i join stores s on s.id = i.store_id where s.name = $1`,
        [name],
      );
      await pool.end();
      await page.goto(`/loja/convite/${rows[0].token}`);
      await expect(
        page.getByText(`Você foi convidado para ser o responsável por ${name}`),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Aceitar convite' }).click();
      await expect(page).toHaveURL(/\/lojas\/loja-nova-\d+\/gerenciar$/);

      await page.getByLabel('Horários').fill('Seg a sex, 18h às 23h');
      await page.getByLabel('Instagram').fill('https://instagram.com/LojaNova/');
      await page.getByRole('button', { name: 'Salvar perfil' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Perfil salvo.' })).toBeVisible();

      await page.getByRole('link', { name: 'Ver o perfil público' }).click();
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
      await expect(page.getByText('Seg a sex, 18h às 23h')).toBeVisible();
      await expect(page.getByRole('link', { name: /Instagram: @lojanova/ })).toHaveAttribute(
        'href',
        'https://www.instagram.com/lojanova/',
      );
      // Está no menu da conta como atalho para gerenciar (a Ana já é dona da Loja E2E também).
      await expect(page.getByRole('link', { name: 'Gerenciar a loja' })).toBeVisible();
    });
  });

  test('perfil público sem login: dados da loja, selo, sem e-mail de contato', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`/lojas/${E2E_IDS.store}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Loja E2E' })).toBeVisible();
    await expect(page.getByText('Loja verificada')).toBeVisible();
    await expect(page.getByText('Ter a sáb, 14h às 22h')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('contato@loja-e2e.test');
    await expect(page.getByRole('link', { name: 'Gerenciar a loja' })).toHaveCount(0);
    // O convite pede login antes de aceitar.
    await page.goto(`/loja/convite/${E2E_IDS.storeInvite}`);
    await expect(page.getByRole('link', { name: 'Entrar para aceitar' })).toBeVisible();
    await context.close();
  });
});
