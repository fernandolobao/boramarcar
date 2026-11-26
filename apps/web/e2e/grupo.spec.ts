import { expect, test } from '@playwright/test';
import { LEARN_TRACKS } from '@boramarcar/core';
import { createDb } from '@boramarcar/db';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

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

  test('quem concluiu "Aprender a jogar" e nunca jogou aparece pronto para a primeira mesa (12.5)', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    const id = 'e2e-novata';
    try {
      await pool.query(
        `insert into "user" (id, name, email, email_verified) values ($1, 'Novata', 'novata@e2e.test', true) on conflict do nothing`,
        [id],
      );
      await pool.query(
        `insert into group_members (group_id, user_id) values ($1, $2) on conflict do nothing`,
        [E2E_IDS.group, id],
      );
      for (const lesson of LEARN_TRACKS.basics) {
        await pool.query(
          `insert into learn_progress (user_id, lesson_id) values ($1, $2) on conflict do nothing`,
          [id, lesson],
        );
      }
      await page.goto('/grupo');
      const row = page.getByRole('listitem').filter({ hasText: 'Novata' });
      await expect(row.getByText('Pronto para a primeira mesa')).toBeVisible();
      // Quem já jogou não ganha o selo.
      await expect(
        page
          .getByRole('listitem')
          .filter({ hasText: 'Bia' })
          .getByText('Pronto para a primeira mesa'),
      ).toHaveCount(0);
    } finally {
      await pool.query(`delete from "user" where id = $1`, [id]);
      await pool.end();
    }
  });
});
