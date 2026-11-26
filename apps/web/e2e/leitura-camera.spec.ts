import { expect, test, type Page } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/**
 * Leitura de cartas pela câmera (flag `card-scanner`, grupo do seed liberado no E2E). A câmera é
 * um vídeo gerado (cartas desenhadas com o nome); o leitor de texto roda de verdade no navegador.
 * A busca no Scryfall é simulada (o CI não tem rede).
 */

/**
 * Câmera falsa: desenha a carta de `window.__card` (`null` = moldura vazia). O teste troca a carta
 * quando quer, sem depender do tempo (no CI, o leitor de texto demora a carregar).
 */
async function fakeCamera(page: Page, first: string | null) {
  await page.addInitScript((card) => {
    const w = window as unknown as { __card: string | null };
    w.__card = card;
    navigator.mediaDevices.getUserMedia = async () => {
      const width = 1080;
      const height = 1920;
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      const draw = () => {
        ctx.fillStyle = '#6b4f3a';
        ctx.fillRect(0, 0, width, height);
        if (w.__card) {
          // Cabe na moldura (em pé, ela é limitada pela largura).
          const ch = Math.min(height * 0.76, (width * 0.8) / (63 / 88));
          const cw = ch * (63 / 88);
          const x = (width - cw) / 2;
          const y = (height - ch) / 2;
          ctx.fillStyle = '#f4efe2';
          ctx.fillRect(x, y, cw, ch);
          ctx.fillStyle = '#111';
          ctx.font = `bold ${Math.round(ch * 0.045)}px serif`;
          ctx.fillText(w.__card, x + cw * 0.08, y + ch * 0.07);
          // Linha de tipo e texto de regras, como numa carta de verdade: com só o nome numa carta
          // em branco, o leitor de texto às vezes não lê nada (no Linux do CI, "Sol Ring" falha).
          ctx.font = `${Math.round(ch * 0.035)}px serif`;
          ctx.fillText('Artifact', x + cw * 0.08, y + ch * 0.6);
          ctx.fillText('Tap: Add three colorless mana.', x + cw * 0.08, y + ch * 0.68);
        }
        requestAnimationFrame(draw);
      };
      draw();
      return c.captureStream(15);
    };
  }, first);
}

const showCard = (page: Page, card: string | null) =>
  page.evaluate((c) => {
    (window as unknown as { __card: string | null }).__card = c;
  }, card);

/** Simula a busca da carta: devolve a carta pelo nome lido; conta as consultas. */
async function fakeLookup(page: Page) {
  const calls: string[] = [];
  await page.route('**/api/v1/cards/scan', async (route) => {
    const { text } = route.request().postDataJSON() as { text: string };
    calls.push(text);
    const elves = /Llanowar|Elves/.test(text);
    await route.fulfill({
      json: {
        names: [],
        match: {
          how: 'name',
          printedName: null,
          card: {
            // Carta do seed (cache local), para a coleção aceitar sem o Scryfall.
            scryfallId: elves ? 'e2e-forest' : 'e2e-sol',
            name: elves ? 'Llanowar Elves' : 'Sol Ring',
            imageUri: null,
            setCode: 'tst',
            collectorNumber: '1',
          },
        },
      },
    });
  });
  return calls;
}

test.describe('leitura de cartas pela câmera', () => {
  test.use({ storageState: AUTH_STATE });

  test('leitura contínua: cada carta nova entra sozinha, sem repetir a que está parada', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    test.setTimeout(180_000);
    await fakeCamera(page, 'Sol Ring');
    const calls = await fakeLookup(page);
    await page.goto('/colecao');
    await page.getByText('Adicionar cartas').first().click();
    await page.getByRole('button', { name: 'Ler pela câmera' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ler cartas pela câmera' });
    await expect(dialog.getByRole('button', { name: 'Leitura contínua' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Sem clicar em nada: Sol Ring entra; trocando a carta, Llanowar Elves entra.
    await expect(dialog.getByRole('heading', { name: '1 carta lida' })).toBeVisible({
      timeout: 90_000,
    });
    await showCard(page, 'Llanowar Elves');
    await expect(dialog.getByRole('heading', { name: '2 cartas lidas' })).toBeVisible({
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    await expect(dialog.getByRole('heading', { name: '2 cartas lidas' })).toBeVisible();
    // A mesma carta parada na moldura não gera consulta de novo.
    expect(calls.length).toBeLessThanOrEqual(4);

    const added = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/collection') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Adicionar 2 cartas' }).click();
    expect((await added).ok()).toBe(true);
    await expect(dialog).toBeHidden();
  });

  test('leitura manual: desliga a contínua e lê com "Ler carta"', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    test.setTimeout(180_000);
    await fakeCamera(page, 'Sol Ring');
    const calls = await fakeLookup(page);
    await page.goto('/colecao');
    await page.getByText('Adicionar cartas').first().click();
    await page.getByRole('button', { name: 'Ler pela câmera' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ler cartas pela câmera' });
    const toggle = dialog.getByRole('button', { name: 'Leitura contínua' });
    // Espera a câmera mostrar a carta (a contínua lê sozinha); no CI, o primeiro quadro demora.
    await expect(dialog.getByRole('heading', { name: '1 carta lida' })).toBeVisible({
      timeout: 90_000,
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const before = calls.length;
    await dialog.getByRole('button', { name: 'Ler carta' }).click();
    await expect.poll(() => calls.length, { timeout: 60_000 }).toBeGreaterThan(before);
    expect(calls.at(-1)).toMatch(/Sol\s*Ring/);
    await expect(dialog.getByRole('heading', { name: '2 cartas lidas' })).toBeVisible();
  });
});
