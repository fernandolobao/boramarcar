import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('perfis e conquistas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('perfil próprio mostra conquistas e decks', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Teste' })).toBeVisible();
    const achievements = page.getByRole('region', { name: 'Conquistas' });
    await expect(achievements.getByText('Primeira vitória')).toBeVisible();
    await expect(achievements.getByText(/Conquistada em/).first()).toBeVisible();
    await expect(achievements.getByText(/de 14 conquistadas/)).toBeVisible();
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
    await page.getByText('Editar deck').click();
    await page.getByRole('radio', { name: /Privado/ }).check();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Deck salvo.')).toBeVisible();
    await expect(page.getByText('Privado', { exact: true }).first()).toBeVisible();
    const api = await page.request.get(`/api/v1/players/e2e-ana`);
    const decks = (await api.json()).player.decks as { id: string; visibility: string }[];
    expect(decks.find((d) => d.id === E2E_IDS.deck)?.visibility).toBe('private');
    // Volta ao padrão para não afetar os outros testes.
    await page.getByRole('radio', { name: /Grupo/ }).check();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Deck salvo.')).toBeVisible();
  });
});
