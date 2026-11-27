import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { createDb } from '@boramarcar/db';
import { E2E_IDS } from './support/seed';

test.describe('perfis e conquistas', () => {
  // Em sequência: o teste da janela de conquistas novas "esquece" uma conquista vista da Ana, e
  // a janela abriria por cima do perfil se os dois rodassem ao mesmo tempo.
  test.describe.configure({ mode: 'serial' });
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('perfil próprio mostra conquistas e decks', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Teste' })).toBeVisible();
    const achievements = page.getByRole('region', { name: 'Conquistas' });
    // Abas: "Em aberto" abre por padrão; "Finalizadas" ao lado.
    const pending = achievements.getByRole('tab', { name: /^Em aberto \(\d+\)$/ });
    await expect(pending).toHaveAttribute('aria-selected', 'true');
    await expect(achievements.getByText(/Progresso: \d+ de \d+/).first()).toBeVisible();
    await achievements.getByRole('tab', { name: /^Finalizadas \(\d+\)$/ }).click();
    await expect(achievements.getByText('Primeira vitória')).toBeVisible();
    await expect(achievements.getByText(/Conquistada em/).first()).toBeVisible();
    await expect(achievements.getByText(/de 38 conquistadas/)).toBeVisible();
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
    // (Com o carregamento na hora da troca de página, a resposta já começou com 200: vale a tela.)
    await page.goto('/jogadores/ninguem');
    await expect(page.getByText('404', { exact: true })).toBeVisible();
    await expect(page.getByText('Grupos em comum')).toHaveCount(0);
  });

  test('deck privado some do perfil para os outros', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto(`/decks/${E2E_IDS.deck}`);
    // "Editar deck" fica no menu "Opções do deck" e abre uma janela; salvar fecha e atualiza.
    await page.getByRole('button', { name: /Opções do deck/ }).click();
    await page.getByRole('menuitem', { name: /Editar deck/ }).click();
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
    await page.getByRole('button', { name: /Opções do deck/ }).click();
    await page.getByRole('menuitem', { name: /Editar deck/ }).click();
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

  test('rivalidades: freguês no painel e o confronto no perfil de outra pessoa', async ({
    page,
  }) => {
    await page.goto('/painel');
    const card = page.getByRole('region', { name: 'Rivalidades' });
    await expect(card.getByText(/^Seu freguês: você venceu/).first()).toBeVisible();
    await page.goto('/jogadores/e2e-bia');
    // Outros testes registram partidas em paralelo: só o formato do texto é conferido.
    await expect(page.getByTestId('versus')).toHaveText(
      /^Entre vocês: você venceu \d+, Bia venceu \d+ \(em \d+ partidas?\)\.$/,
    );
  });

  test('admin: vê o deck privado de outra pessoa (com aviso) e as contagens no /admin', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    const deckId = `e2e-bia-privado-${Date.now()}`;
    const { pool } = createDb(process.env.E2E_DATABASE_URL!, { max: 1 });
    await pool.query(
      `insert into decks (id, owner_id, name, source, visibility) values ($1, 'e2e-bia', 'Deck secreto da Bia', 'text', 'private')`,
      [deckId],
    );
    await pool.end();
    await page.goto(`/decks/${deckId}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Deck secreto da Bia' }),
    ).toBeVisible();
    await expect(page.getByRole('note')).toContainText('como admin do ArcanaKin');
    await page.goto('/admin?aba=contas');
    const bia = page.getByRole('listitem').filter({ hasText: 'bia@e2e.test' });
    await expect(bia.getByText('Decks', { exact: true })).toBeVisible();
    await expect(bia.getByText('Cartas na coleção')).toBeVisible();
  });
});
