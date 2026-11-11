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
    // Nota e bracket no lugar das proxies.
    await expect(deck.getByText(/^Nota \d+$/)).toBeVisible();
    await expect(deck.getByText(/^Bracket (1–2|3|4–5)$/)).toBeVisible();
    await expect(deck.getByText(/prox/)).toHaveCount(0);
    // O cartão inteiro é clicável (o link cobre a área com ::after).
    const box = await deck.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + 20);
    await expect(page).toHaveURL(new RegExp(`/decks/${E2E_IDS.deck}$`));
    // Fora da navegação principal há "Voltar", que volta para a página anterior.
    await page.getByRole('link', { name: 'Voltar', exact: true }).click();
    await expect(page).toHaveURL(/\/decks$/);
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toHaveCount(0);
  });

  test('Voltar sem página anterior leva à página mãe', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}/imprimir`);
    await page.getByRole('link', { name: 'Voltar', exact: true }).click();
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

  test('análise: funções, bracket, base de mana e mão inicial', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    await expect(page.getByRole('heading', { name: 'Funções das cartas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Ramp/ })).toContainText('meta: 10');
    await expect(page.getByRole('heading', { name: 'Bracket estimado' })).toBeVisible();
    await expect(page.getByTestId('deck-bracket')).toHaveText('1–2 · Exhibition ou Core');
    await expect(page.getByRole('heading', { name: 'Base de mana' })).toBeVisible();
    const drops = page.getByRole('table', { name: 'Ter terreno para jogar em todos os turnos' });
    await expect(drops.getByRole('row')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Atualizar análise' })).toBeVisible();
  });

  test('importa lista colada como Modern e valida pelas regras do formato', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'cria dados: só no desktop');
    await page.goto('/decks/importar');
    await page.getByRole('button', { name: 'Colar lista' }).click();
    await page.getByLabel('Lista de cartas').fill('4 Sol Ring\n20 Forest');
    await page.getByLabel('Nome do deck').fill('Teste Modern');
    await page.getByLabel('Tipo de jogo').selectOption('modern');
    await page.getByRole('button', { name: 'Importar deck' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Teste Modern' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Validação · Modern' })).toBeVisible();
    await expect(page.getByText('O deck tem 24 cartas (mínimo: 60).')).toBeVisible();
    await expect(
      page.getByText(/A nota por funções vale para formatos com comandante/),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bracket estimado' })).toHaveCount(0);
  });

  test('folha de proxies em PDF', async ({ page }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    const link = page.getByRole('link', { name: 'Baixar PDF pronto' });
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
      .locator('section[aria-labelledby="deck-cards-title"] table tbody tr')
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

  test('folha para imprimir pelo navegador: cartas em tamanho real com imagem', async ({
    page,
  }) => {
    await page.goto(`/decks/${E2E_IDS.deck}`);
    await page.getByLabel('O deck todo').check();
    await page.getByRole('link', { name: 'Abrir folha para imprimir' }).click();
    await expect(page).toHaveURL(/imprimir\?which=all&page=a4/);
    await expect(page.getByRole('heading', { level: 1, name: 'Imprimir proxies' })).toBeVisible();
    const sheet = page.getByRole('region', { name: 'Página 1 de 5' });
    await expect(sheet).toBeVisible();
    const card = sheet.getByRole('img', { name: 'Omnath, Locus of Mana' });
    await expect(card).toHaveAttribute('src', /cards\.scryfall\.io\/large\//);
    // 63 mm na tela (96 dpi): ~238 px.
    const box = (await card.locator('..').boundingBox())!;
    expect(box.width).toBeCloseTo((63 / 25.4) * 96, 0);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  });
});
