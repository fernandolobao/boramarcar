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

  test('lista de decks em cartões com capa e um único link por deck', async ({ page }) => {
    await page.goto('/decks');
    const deck = page.getByRole('listitem').filter({ hasText: 'Omnath Ramp' });
    await expect(deck.getByRole('link')).toHaveCount(1);
    await expect(deck.getByText('Commander', { exact: true })).toBeVisible();
    await expect(deck.getByText('Omnath, Locus of Mana')).toBeVisible();
    await expect(deck.getByText('Identidade de cor: Verde')).toBeAttached();
    // O cartão inteiro é clicável (o link cobre a área com ::after).
    const box = await deck.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + 20);
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_IDS.deck}$`));
  });

  test('cartas em modo visual e lista; ampliar abre diálogo que fecha com Esc', async ({
    page,
  }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    await expect(page.getByRole('img', { name: 'Omnath, Locus of Mana' })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Terrenos (36)' })).toBeVisible();

    const zoom = page.getByRole('button', { name: 'Ampliar Cultivate' });
    await zoom.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Cultivate' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(zoom).toBeFocused();

    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Sol Ring' })).toBeVisible();
  });

  test('editor: proxies parciais e lista exportada', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto(`/decks/${E2E_IDS.deck}`);
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const proxies = page.getByRole('spinbutton', { name: 'Proxies de Forest' });
    await proxies.fill('5');
    await proxies.press('Enter');
    await expect(page.getByText('Forest salva.')).toBeVisible();

    await page.getByRole('button', { name: 'Visual', exact: true }).click();
    await expect(page.getByText('5 proxies', { exact: true })).toBeVisible();

    const exported = await page.request.get(`/api/v1/decks/${E2E_IDS.deck}/export?format=proxies`);
    expect(await exported.text()).toContain('31 Forest\n5 Forest #proxy');
  });

  test('folha de proxies em PDF', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    const link = page.getByRole('link', { name: 'Baixar PDF' });
    await expect(link).toHaveAttribute('href', /which=proxies&page=a4/);
    const response = await page.request.get((await link.getAttribute('href'))!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('modo lista: colunas alinhadas entre os grupos', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    const lefts = await page
      .locator('table tbody tr')
      .evaluateAll((rows) =>
        rows.map((r) =>
          [...r.querySelectorAll('td')].map((td) => Math.round(td.getBoundingClientRect().left)),
        ),
      );
    expect(lefts.length).toBeGreaterThan(3);
    for (const row of lefts) expect(row).toEqual(lefts[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  });
});
