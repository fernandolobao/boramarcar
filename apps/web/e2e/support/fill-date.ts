import type { Locator, Page } from '@playwright/test';

/**
 * Preenche um `DateField` do design system (dia, mês e ano em segmentos do React Aria): clica no
 * primeiro segmento e digita na ordem do idioma pt-BR (dia, mês, ano).
 */
export async function fillDate(scope: Page | Locator, label: string, isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  const group = scope.getByRole('group', { name: label, exact: true });
  const first = group.getByRole('spinbutton').first();
  await first.click();
  await first.pressSequentially(`${day}${month}${year}`);
}
