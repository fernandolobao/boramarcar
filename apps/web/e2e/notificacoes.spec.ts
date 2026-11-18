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
    // Outros testes rodam em paralelo com a mesma pessoa: pode haver mais de uma nova.
    const bell = page.getByRole('banner').getByRole('link', { name: /^Notificações: \d+ novas?$/ });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page).toHaveURL(/\/notificacoes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notificações' })).toBeVisible();
    const item = page.getByRole('link', { name: /Você venceu uma partida em/ }).first();
    await expect(item).toHaveAttribute('href', '/eventos/e2e-event-past');
    // Lidas: na próxima página o sino já não tem número.
    await expect
      .poll(async () => {
        await page.goto('/painel');
        return page.getByRole('banner').getByRole('link', { name: 'Notificações' }).count();
      })
      .toBe(1);
  });
});

test.describe('avisos do ArcanaKin', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('admin escreve, publica em dois cliques e o aviso chega na central', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    const title = `Aviso E2E ${Date.now()}`;
    await page.goto('/admin');
    const section = page.getByRole('region', { name: 'Avisos do ArcanaKin' });
    await section.getByLabel('Título').fill(title);
    await section.getByLabel('Texto').fill('Linha 1\nLinha 2');
    await section.getByLabel('Para quem').selectOption({ label: 'Mesa de Quinta' });
    await section.getByRole('button', { name: 'Salvar rascunho' }).click();
    const publish = section.getByRole('button', { name: `Publicar (${title})` });
    await publish.click();
    await section
      .getByRole('button', { name: `Confirmar: publicar para Mesa de Quinta (${title})` })
      .click();
    await expect(section.getByText(/Publicado para \d+ pessoas/)).toBeVisible();

    await page.goto('/notificacoes');
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(/Linha 1\s*Linha 2/)).toBeVisible();
  });
});
