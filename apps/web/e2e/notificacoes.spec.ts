import { expect, test } from '@playwright/test';
import { createDb } from '@boramarcar/db';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('central de notificações', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('o sino mostra as não lidas; abrir a central lista e marca como lidas', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    // Outros testes podem ter aberto a central antes: começa com tudo lido e uma nova.
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    await pool.query("update notifications set read_at = now() where user_id = 'e2e-ana'");
    await pool.query(
      `insert into notifications (id, user_id, group_id, kind, data) values ($1, 'e2e-ana', $2, 'game', $3)`,
      [
        `e2e-n-${Date.now()}`,
        E2E_IDS.group,
        JSON.stringify({
          kind: 'game',
          gameId: 'e2e-game-1',
          eventId: E2E_IDS.pastEvent,
          result: 'win',
          winnerIds: ['e2e-ana'],
        }),
      ],
    );
    await pool.end();
    await page.goto('/painel');
    const bell = page.getByRole('banner').getByRole('link', { name: 'Notificações: 1 nova' });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page).toHaveURL(/\/notificacoes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notificações' })).toBeVisible();
    const item = page.getByRole('link', { name: /Você venceu uma partida em/ }).first();
    await expect(item).toHaveAttribute('href', '/eventos/e2e-event-past');
    await expect(item.getByText('Nova')).toBeVisible();
    // Lidas: na próxima página o sino já não tem número.
    await expect
      .poll(async () => {
        await page.goto('/painel');
        return page.getByRole('banner').getByRole('link', { name: 'Notificações' }).count();
      })
      .toBe(1);
  });
});
