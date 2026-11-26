import { createDb } from '@boramarcar/db';
import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { fillDate } from './support/fill-date';
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
      await page.goto('/admin?aba=lojas');
      const section = page.getByRole('region', { name: 'Lojas' });
      await section.getByLabel('Nome da loja').fill(name);
      // Cidade da lista do IBGE (10.3): digitar e escolher.
      await section.getByRole('combobox', { name: 'Cidade' }).fill('Canoas');
      await page.getByRole('option', { name: 'Canoas, RS' }).click();
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

  test.describe('eventos de loja', () => {
    test.use({ storageState: AUTH_STATE });

    test('equipe cria o evento; inscrição pelo código do balcão; convidado e check-in', async ({
      page,
    }) => {
      test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
      const title = `Noite de Modern ${Date.now()}`;
      await page.goto(`/lojas/${E2E_IDS.store}/gerenciar`);
      await page.getByLabel('Título do evento').fill(title);
      await fillDate(page, 'Dia', '2099-05-07');
      await page.getByRole('radio', { name: 'Noite livre' }).check({ force: true });
      await page.getByRole('button', { name: 'Criar evento' }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: `${title}: inscrições` }),
      ).toBeVisible();
      const code = (await page.locator('p.font-mono').textContent())!.trim();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

      // A Ana chega na loja e digita o código (em minúsculas, como vier).
      await page.goto('/codigo');
      await page.getByLabel('Código do evento').fill(code.toLowerCase());
      await page.getByRole('button', { name: 'Me inscrever' }).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(
        page.getByRole('status').filter({ hasText: 'Você está inscrito.' }),
      ).toBeVisible();

      // A equipe inscreve quem chegou sem conta e faz o check-in.
      await page.getByRole('link', { name: 'Gerenciar o evento' }).click();
      await page.getByLabel('Inscrever quem chegou sem conta').fill('Zé da Esquina');
      await page.getByRole('button', { name: 'Inscrever', exact: true }).click();
      const ze = page.getByRole('listitem').filter({ hasText: 'Zé da Esquina' });
      await expect(ze).toContainText('convidado');
      await ze.getByRole('checkbox', { name: /Chegou/ }).check({ force: true });
      await expect(ze.getByRole('checkbox', { name: /Chegou/ })).toBeChecked();
    });
  });

  test.describe('torneio de loja', () => {
    test.use({ storageState: AUTH_STATE });

    test('com quem fez check-in (convidados também), ao vivo na página do evento', async ({
      page,
    }) => {
      test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
      const title = `Copa da loja ${Date.now()}`;
      await page.goto(`/lojas/${E2E_IDS.store}/gerenciar`);
      await page.getByLabel('Título do evento').fill(title);
      await fillDate(page, 'Dia', '2099-06-04');
      await page.getByRole('button', { name: 'Criar evento' }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: `${title}: inscrições` }),
      ).toBeVisible();
      for (const name of ['Zé', 'Lia']) {
        await page.getByLabel('Inscrever quem chegou sem conta').fill(name);
        await page.getByRole('button', { name: 'Inscrever', exact: true }).click();
        const row = page.getByRole('listitem').filter({ hasText: name });
        await row.getByRole('checkbox', { name: /Chegou/ }).check({ force: true });
        await expect(row.getByRole('checkbox', { name: /Chegou/ })).toBeChecked();
      }
      await page.reload();
      await page.getByRole('button', { name: 'Começar o torneio com quem chegou' }).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Rodada 1 de 3' })).toBeVisible();
      // A equipe registra a mesa dos convidados (Commander: um pod).
      await page
        .getByRole('radiogroup', { name: 'Quem venceu a mesa 1' })
        .getByText('Zé', { exact: true })
        .click();
      await page.getByRole('button', { name: /Salvar resultado/ }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Resultado: Venceu: Zé' }),
      ).toBeVisible();
      const standings = page.getByRole('region', { name: 'Classificação' }).first();
      await expect(standings.getByRole('row').nth(1)).toContainText('Zé');
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
    // O evento é público; a inscrição pede login. Os nomes de quem se inscreveu não aparecem.
    await page.goto(`/lojas/${E2E_IDS.store}/eventos/${E2E_IDS.storeEvent}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Commander de sexta na loja' }),
    ).toBeVisible();
    await expect(page.getByText('1 de 8 vagas')).toBeVisible();
    await expect(page.getByText('1º lugar: 3 boosters')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Bia');
    await expect(page.locator('main')).not.toContainText('E2ELJ7');
    await expect(page.getByRole('link', { name: 'Entrar para se inscrever' })).toBeVisible();
    // O convite pede login antes de aceitar.
    await page.goto(`/loja/convite/${E2E_IDS.storeInvite}`);
    await expect(page.getByRole('link', { name: 'Entrar para aceitar' })).toBeVisible();
    await context.close();
  });
});
