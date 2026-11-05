import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('deck', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('curva de mana desenha barras com altura proporcional', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    const curve = page.getByRole('list', { name: 'Curva de mana' });
    await expect(curve.getByRole('listitem', { name: 'Custo 1: 1 carta' })).toBeVisible();
    await expect(curve.getByRole('listitem', { name: 'Custo 3: 1 carta' })).toBeVisible();

    const height = async (bucket: string) =>
      (await page.getByTestId(`curve-bar-${bucket}`).boundingBox())?.height ?? 0;
    // Deck semeado: Sol Ring (1) e Cultivate (3) — as duas barras cheias, as demais vazias.
    expect(await height('1')).toBeGreaterThan(100);
    expect(await height('3')).toBeCloseTo(await height('1'), 0);
    expect(await height('2')).toBe(0);
  });
});
