import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

test.describe('Admin: registro de atividade', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('criar e editar um deck aparece na aba Atividade, com filtros no endereço', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    const name = `Atividade E2E ${Date.now()}`;
    const created = await page.request.post('/api/v1/decks', {
      data: { kind: 'empty', name, format: 'commander' },
    });
    expect(created.ok()).toBe(true);
    const deckId = (await created.json()).deck.id as string;
    for (const suffix of [' A', ' B']) {
      const edited = await page.request.patch(`/api/v1/decks/${deckId}`, {
        data: { name: `${name}${suffix}` },
      });
      expect(edited.ok()).toBe(true);
    }

    await page.goto('/admin?aba=atividade');
    const section = page.getByRole('region', { name: 'Atividade' });
    await section.getByLabel('Ação').selectOption('deck_updated');
    await section.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(/tipo=deck_updated/);
    const list = page.getByRole('list', { name: 'Ações registradas' });
    // Duas edições na mesma hora: uma linha, com o nome mais recente e a contagem.
    await expect(list.getByText(`editou o deck ${name} B (2 alterações)`)).toBeVisible();
    await expect(list.getByText(`criou o deck ${name}`)).toHaveCount(0);

    await section.getByLabel('Ação').selectOption('deck_created');
    await section.getByRole('button', { name: 'Filtrar' }).click();
    await expect(list.getByText(`criou o deck ${name}`, { exact: false })).toBeVisible();
  });
});
