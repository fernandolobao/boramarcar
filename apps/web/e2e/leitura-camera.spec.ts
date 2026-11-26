import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';

/**
 * Leitura de cartas pela câmera (flag `card-scanner`, grupo do seed liberado no E2E). A câmera é
 * um vídeo gerado (uma carta desenhada com o nome "Sol Ring"); o leitor de texto roda de verdade
 * no navegador. A busca no Scryfall é simulada (o CI não tem rede).
 */
test.describe('leitura de cartas pela câmera', () => {
  test.use({ storageState: AUTH_STATE });

  test('lê a carta, confere na lista e adiciona à coleção', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados: só no desktop');
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const w = 1080;
        const h = 1920;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        const draw = () => {
          ctx.fillStyle = '#6b4f3a';
          ctx.fillRect(0, 0, w, h);
          // Cabe na moldura (em pé, ela é limitada pela largura).
          const ch = Math.min(h * 0.76, (w * 0.8) / (63 / 88));
          const cw = ch * (63 / 88);
          const x = (w - cw) / 2;
          const y = (h - ch) / 2;
          ctx.fillStyle = '#f4efe2';
          ctx.fillRect(x, y, cw, ch);
          ctx.fillStyle = '#111';
          ctx.font = `bold ${Math.round(ch * 0.045)}px serif`;
          ctx.fillText('Sol Ring', x + cw * 0.08, y + ch * 0.07);
          ctx.font = `${Math.round(ch * 0.03)}px sans-serif`;
          ctx.fillText('Artifact', x + cw * 0.08, y + ch * 0.6);
          requestAnimationFrame(draw);
        };
        draw();
        return c.captureStream(15);
      };
    });
    // A rota recebe só o texto lido; simula a resposta (sem Scryfall no CI).
    let sent: { text: string; lines: { text: string }[] } | null = null;
    await page.route('**/api/v1/cards/scan', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        json: {
          names: ['Sol Ring'],
          match: {
            how: 'name',
            printedName: null,
            card: {
              scryfallId: 'e2e-sol',
              name: 'Sol Ring',
              imageUri: null,
              setCode: 'tst',
              collectorNumber: '1',
            },
          },
        },
      });
    });

    await page.goto('/colecao');
    await page.getByText('Adicionar cartas').first().click();
    await page.getByRole('button', { name: 'Ler pela câmera' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ler cartas pela câmera' });
    await expect(dialog.getByRole('button', { name: 'Ler carta' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Ler carta' }).click();
    await expect(dialog.getByRole('status')).toContainText('Achei: Sol Ring', { timeout: 90_000 });
    expect(sent!.text).toMatch(/Sol\s*Ring/);
    await expect(dialog.getByRole('heading', { name: '1 carta lida' })).toBeVisible();

    const added = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/collection') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Adicionar 1 carta' }).click();
    expect((await added).ok()).toBe(true);
    await expect(dialog).toBeHidden();
  });
});
