import { expect, test } from '@playwright/test';
import { createDb } from '@boramarcar/db';

/** Cadastro com e-mail e senha: confirmar o e-mail antes de entrar, e "esqueci a senha". */
test.describe('conta com e-mail e senha', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');

  test('cria a conta, não entra sem confirmar, entra depois de confirmado', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'cria conta: só no desktop');
    const email = `nova-${Date.now()}@e2e.test`;
    await page.goto('/painel');
    // Sem login, a área logada leva para a entrada (e volta depois).
    await expect(page).toHaveURL(/\/entrar\?para=%2Fpainel$/);
    await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible();
    const form = page.getByRole('form', { name: 'Criar conta' });
    await form.getByLabel('Seu nome').fill('Nina Nova');
    await form.getByLabel('E-mail').fill(email);
    await form.getByLabel('Senha').fill('curta');
    await form.getByRole('button', { name: 'Criar conta' }).click();
    // O navegador barra senha curta (minLength) antes de enviar.
    await expect(page.getByText(/Quase lá/)).toHaveCount(0);
    await form.getByLabel('Senha').fill('senha-segura-123');
    await form.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText(new RegExp(`Enviamos um link para ${email}`))).toBeVisible();

    // Sem confirmar o e-mail, não entra.
    await page.goto('/entrar');
    const signIn = page.getByRole('form', { name: 'Entrar' });
    await signIn.getByLabel('E-mail').fill(email);
    await signIn.getByLabel('Senha').fill('senha-segura-123');
    await signIn.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Confirme o seu e-mail' }),
    ).toBeVisible();

    // Senha errada.
    await signIn.getByLabel('Senha').fill('outra-senha-999');
    await signIn.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' }),
    ).toBeVisible();

    // Confirmado (o link do e-mail faz isso): entra (sem grupo ainda, o painel leva ao grupo).
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    await pool.query('update "user" set email_verified = true where email = $1', [email]);
    await pool.end();
    await signIn.getByLabel('Senha').fill('senha-segura-123');
    await signIn.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await expect(page).toHaveURL(/\/(painel|grupo)$/);
  });

  test('esqueci a senha responde igual exista ou não a conta; link inválido avisa', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await page.getByRole('link', { name: 'Esqueci a senha' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Esqueci a senha' })).toBeVisible();
    await page.getByLabel('E-mail').fill('ninguem@e2e.test');
    await page.getByRole('button', { name: 'Enviar o link' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Se existir uma conta' }),
    ).toBeVisible();
    await page.goto('/redefinir-senha?error=INVALID_TOKEN');
    await expect(page.getByRole('alert').filter({ hasText: 'Este link venceu' })).toBeVisible();
  });
});
