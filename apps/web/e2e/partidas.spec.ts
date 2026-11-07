import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('partidas', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('mostra tipo de jogo, times, vencedores, detalhes e a arte do comandante', async ({
    page,
  }) => {
    await page.goto(`/eventos/${E2E_IDS.pastEvent}`);
    const game3 = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: /Partida 3/ }),
    });
    await expect(
      game3.getByRole('heading', { name: 'Partida 3 Two-Headed Giant (2×2)' }),
    ).toBeVisible();
    await expect(game3.getByText('Vencedores: Ana Teste, Caio')).toBeVisible();
    await expect(game3.getByText('Ana Teste começou · Acabou no turno 8 · 75 min')).toBeVisible();
    await expect(game3.getByText('Time 1', { exact: true })).toBeVisible();
    await expect(game3.getByText('Omnath Ramp — Omnath, Locus of Mana')).toBeVisible();
    // Arte decorativa: não aparece para leitores de tela.
    await expect(game3.locator('img[alt=""]')).toHaveCount(1);
  });

  test('edita uma partida pelo teclado e o resultado muda', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto(`/eventos/${E2E_IDS.pastEvent}`);
    const toggle = page.getByRole('button', { name: 'Editar partida 2' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const form = page.locator(
      `#${await toggle.getAttribute('aria-controls')}`.replace(/:/g, '\\:'),
    );
    await form.getByLabel('A partida terminou empatada').uncheck();
    await form.getByRole('radio', { name: 'Venceu: Bia' }).check();
    await form.getByText('Mais detalhes (opcional)').click();
    await form.getByLabel('Turno em que acabou').fill('11');
    await form.getByRole('button', { name: 'Salvar partida' }).click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    const game2 = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: /Partida 2/ }),
    });
    await expect(game2.getByText('Vencedor: Bia')).toBeVisible();
    await expect(game2.getByText('Acabou no turno 11')).toBeVisible();
  });
});

test.describe('modo mesa', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('contador em tela cheia e registro da partida no encontro', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'muda dados compartilhados: só no desktop');
    await page.goto(`/eventos/${E2E_IDS.upcomingEvent}`);
    await page.getByRole('link', { name: 'Abrir modo mesa' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Modo mesa' })).toBeVisible();
    // Confirmados (Ana, Bia, Caio) já marcados; Duda respondeu "talvez".
    await expect(page.getByRole('checkbox', { name: /Duda/ })).not.toBeChecked();
    await page.getByRole('button', { name: 'Começar' }).click();

    await page
      .getByRole('button', { name: 'Dano de comandante, marcadores e opções de Bia' })
      .click();
    const bia = page.getByRole('dialog', { name: 'Bia', exact: true });
    await bia.getByRole('button', { name: 'Desistir da partida' }).click();
    await bia.getByRole('button', { name: 'Fechar' }).click();
    // Caio cai por vida: segurar o "−" tira 10 de cada vez.
    const minus = page.getByRole('button', { name: /^Tirar 1 de vida de Caio/ });
    await minus.dispatchEvent('pointerdown');
    await expect(page.getByText('Ana Teste é o último na mesa!')).toBeVisible({ timeout: 6000 });
    await minus.dispatchEvent('pointerup');
    await expect(page.getByText('Ana Teste é o último na mesa!')).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Menu da mesa' })
      .getByRole('button', { name: 'Fechar' })
      .click();
    // A partida fica salva no aparelho ao recarregar.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Partida em andamento neste aparelho' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continuar partida' }).click();
    await page.getByRole('button', { name: 'Menu da mesa' }).click();
    await page.getByRole('button', { name: 'Encerrar e registrar' }).click();
    await expect(page.getByRole('radio', { name: /Ana Teste/ })).toBeChecked();
    await page.getByRole('button', { name: 'Salvar partida' }).click();
    await expect(page).toHaveURL(new RegExp(`/eventos/${E2E_IDS.upcomingEvent}$`));
    await expect(page.getByText(/Vencedor: Ana Teste/).first()).toBeVisible();
  });
});
