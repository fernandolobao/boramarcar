import { expect, test } from '@playwright/test';
import { AUTH_STATE } from './support/global-setup';
import { E2E_IDS } from './support/seed';

test.describe('mesa de testes solo (11.4)', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer banco (E2E_DATABASE_URL)');
  test.use({ storageState: AUTH_STATE });

  test('do deck à mesa: manter, jogar, virar, próximo turno, desfazer, ficha e procurar', async ({
    page,
  }) => {
    await page.goto(`/decks/${E2E_IDS.deck}?aba=mao`);
    await page.getByRole('link', { name: 'Testar o deck' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mesa de testes' })).toBeVisible();
    const hand = page.getByRole('region', { name: /^Mão/ });
    await expect(hand.getByRole('button', { name: /^Ações:/ })).toHaveCount(7);

    await page.getByRole('button', { name: 'Manter' }).click();
    await expect(page.getByText('Turno 1', { exact: true })).toBeVisible();

    // Jogar a primeira carta da mão.
    await hand
      .getByRole('button', { name: /^Ações:/ })
      .first()
      .click();
    await page.getByRole('menuitem', { name: 'Jogar' }).click();
    await expect(hand.getByRole('button', { name: /^Ações:/ })).toHaveCount(6);
    const field = page.getByRole('region', { name: /^(Terrenos|Outras permanentes) \(1\)/ });
    await field.getByRole('button', { name: /^Ações:/ }).click();
    await page.getByRole('menuitem', { name: 'Virar' }).click();
    await expect(field.getByRole('button', { name: /virada/ })).toBeVisible();

    await page.getByRole('button', { name: 'Próximo turno' }).click();
    await expect(page.getByText('Turno 2', { exact: true })).toBeVisible();
    await expect(field.getByRole('button', { name: /virada/ })).toHaveCount(0);
    await expect(hand.getByRole('button', { name: /^Ações:/ })).toHaveCount(7);

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.getByText('Turno 1', { exact: true })).toBeVisible();

    // Fichas no campo.
    await page.getByRole('button', { name: 'Criar ficha' }).click();
    await page.getByLabel('Nome da ficha').fill('Elf Warrior');
    await page.getByLabel('Quantidade').fill('2');
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await expect(page.getByRole('button', { name: /Elf Warrior, ficha/ })).toHaveCount(2);

    // "?" do cemitério: a definição do glossário, com o link.
    await page.getByRole('button', { name: 'O que é Cemitério?' }).click();
    await expect(page.getByRole('link', { name: 'Ver no glossário' }).first()).toHaveAttribute(
      'href',
      '/aprender/glossario#cemiterio',
    );

    // "Ver carta": a carta aberta numa janela.
    await hand
      .getByRole('button', { name: /^Ações:/ })
      .first()
      .click();
    await page.getByRole('menuitem', { name: 'Ver carta…' }).click();
    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: /Fechar/ }).click();
    await expect(card).toBeHidden();

    // Procurar no grimório: a carta vai para a mão.
    await page.getByRole('button', { name: 'Procurar no grimório' }).click();
    const dialog = page.getByRole('dialog', { name: 'Procurar no grimório' });
    await dialog
      .getByRole('button', { name: /para a mão$/ })
      .first()
      .click();
    await expect(dialog).toBeHidden();
    await expect(hand.getByRole('button', { name: /^Ações:/ })).toHaveCount(7);
  });
});
