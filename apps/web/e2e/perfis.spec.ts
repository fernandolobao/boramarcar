import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { createDb } from '@boramarcar/db';
import { E2E_IDS } from './support/seed';

test.describe('perfis e conquistas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('perfil próprio mostra conquistas e decks', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Teste' })).toBeVisible();
    const achievements = page.getByRole('region', { name: 'Conquistas' });
    // Abas: "Para conquistar" abre por padrão; "Conquistadas" ao lado.
    const pending = achievements.getByRole('tab', { name: /^Para conquistar \(\d+\)$/ });
    await expect(pending).toHaveAttribute('aria-selected', 'true');
    await expect(achievements.getByText(/Progresso: \d+ de \d+/).first()).toBeVisible();
    await achievements.getByRole('tab', { name: /^Conquistadas \(\d+\)$/ }).click();
    await expect(achievements.getByText('Primeira vitória')).toBeVisible();
    await expect(achievements.getByText(/Conquistada em/).first()).toBeVisible();
    await expect(achievements.getByText(/de 27 conquistadas/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Omnath Ramp' })).toBeVisible();
  });

  test('perfil de outro jogador a partir do grupo, sem e-mail', async ({ page }) => {
    await page.goto('/grupo');
    await page.getByRole('link', { name: 'Bia', exact: true }).click();
    await expect(page).toHaveURL(/\/jogadores\/e2e-bia$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Bia' })).toBeVisible();
    await expect(page.getByText('bia@e2e.test')).toHaveCount(0);
    await expect(page.getByText('Grupos em comum')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Conquistas' })).toBeVisible();
    // Quem não divide grupo não existe para o visitante.
    expect((await page.goto('/jogadores/ninguem'))!.status()).toBe(404);
  });

  test('deck privado some do perfil para os outros', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto(`/decks/${E2E_IDS.deck}`);
    // "Editar deck" abre uma janela no topo da página; salvar fecha e atualiza a página.
    await page.getByRole('button', { name: 'Editar deck' }).click();
    let dialog = page.getByRole('dialog', { name: 'Editar deck' });
    // Rádio do React Aria: o input fica escondido sob o rótulo, que recebe o clique.
    await dialog.getByRole('radio', { name: /Privado/ }).check({ force: true });
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Privado', { exact: true }).first()).toBeVisible();
    const api = await page.request.get(`/api/v1/players/e2e-ana`);
    const decks = (await api.json()).player.decks as { id: string; visibility: string }[];
    expect(decks.find((d) => d.id === E2E_IDS.deck)?.visibility).toBe('private');
    // Volta ao padrão para não afetar os outros testes.
    await page.getByRole('button', { name: 'Editar deck' }).click();
    dialog = page.getByRole('dialog', { name: 'Editar deck' });
    await dialog.getByRole('radio', { name: /Grupo/ }).check({ force: true });
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialog).toBeHidden();
  });

  test('janela de conquistas novas no painel: aparece uma vez e some depois de vista', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    // "Esquece" que a Ana viu a primeira vitória.
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    await pool.query('delete from onboarding_steps where user_id = $1 and step = $2', [
      'e2e-ana',
      'achievement:first_win',
    ]);
    await pool.end();

    await page.goto('/painel');
    const dialog = page.getByRole('dialog', { name: 'Conquista nova!' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Primeira vitória')).toBeVisible();
    // Espera a chamada que marca como vista antes de recarregar.
    await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/v1/me/achievements/seen')),
      dialog.getByRole('button', { name: 'Legal!' }).click(),
    ]);
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Conquista nova!' })).toHaveCount(0);
  });
});
