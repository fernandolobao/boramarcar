import type { Locator, Page } from '@playwright/test';

/**
 * Escolhe uma opção num `Select` do design system: abre pelo botão (o nome é "opção escolhida +
 * rótulo") e clica na opção da lista, como uma pessoa faria.
 */
export async function pick(scope: Page | Locator, label: string, option: string) {
  const page = 'page' in scope ? scope.page() : scope;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await scope.getByRole('button', { name: new RegExp(`(^|\\s)${escaped}$`) }).click();
  await page.getByRole('listbox').getByRole('option', { name: option, exact: true }).click();
}
