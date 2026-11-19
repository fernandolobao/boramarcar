import { expect, test } from '@playwright/test';
import { createDb } from '@boramarcar/db';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

/** Seguidores e avisos da loja (10.4). */
test.describe('seguir loja e avisos', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('sem conta, a loja oferece "Entre para seguir"', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`/lojas/${E2E_IDS.store}`);
    await expect(page.getByRole('link', { name: 'Entre para seguir' })).toHaveAttribute(
      'href',
      `/entrar?para=%2Flojas%2F${E2E_IDS.store}`,
    );
    await context.close();
  });

  test('seguir outra loja (botão liga/desliga) e a dona manda um aviso para quem segue', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    // Uma loja sem a Ana na equipe, para ela seguir.
    const slug = `loja-seguir-${Date.now()}`;
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    await pool.query(
      `insert into stores (id, slug, name, city, contact_email, created_by) values ($1, $1, 'Loja Para Seguir', 'Porto Alegre', 'seg@x.test', 'e2e-bia')`,
      [slug],
    );
    // Rodadas repetidas no mesmo banco não esbarram no limite de 3 avisos por semana.
    await pool.query(`delete from store_notices where store_id = 'e2e-store'`);
    await pool.end();
    await page.goto(`/lojas/${slug}`);
    const follow = page.getByRole('button', { name: 'Seguir loja' });
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    await follow.click();
    await expect(follow).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Você segue Loja Para Seguir' }),
    ).toBeVisible();

    // A dona da loja E2E vê a seção e envia um aviso (o limite é de 3 por semana).
    await page.goto(`/lojas/${E2E_IDS.store}/gerenciar`);
    const section = page.getByRole('region', { name: 'Quem segue a loja' });
    await expect(
      section.getByText(/^(Ninguém segue a loja ainda\.|\d+ pessoas? seguem? a loja\.)$/),
    ).toBeVisible();
    await section
      .getByRole('textbox', { name: 'Aviso para quem segue' })
      .fill('Chegou a coleção nova!');
    await section.getByRole('button', { name: 'Enviar aviso' }).click();
    await expect(section.getByRole('status')).toHaveText(/Aviso enviado para/);
    await expect(
      section.getByRole('listitem').filter({ hasText: 'Chegou a coleção nova!' }).first(),
    ).toBeVisible();
  });
});
