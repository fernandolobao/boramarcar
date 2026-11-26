import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

/**
 * No iPhone, tocar num campo com fonte menor que 16 px faz o navegador dar zoom na página (e o
 * zoom fica, cortando o layout à direita). Em telas de toque, todo campo de texto tem 16 px.
 */
test.describe('campos no celular', () => {
  test.use({ storageState: AUTH_STATE });

  test('campos de texto, seleção e área de texto com pelo menos 16 px', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'só em tela de toque');
    for (const path of [
      `/eventos/${E2E_IDS.upcomingEvent}`,
      `/decks/${E2E_IDS.deck}`,
      '/colecao',
      '/disponibilidade',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const small = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), select, textarea',
          ),
        )
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({
            tag: el.tagName,
            name: el.getAttribute('name') ?? el.id,
            size: parseFloat(getComputedStyle(el).fontSize),
          }))
          .filter((f) => f.size < 16),
      );
      expect(small, path).toEqual([]);
    }
  });
});
