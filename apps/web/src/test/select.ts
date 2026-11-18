import { fireEvent, screen, within } from '@testing-library/react';

/** O nome do botão é "opção escolhida + rótulo" (padrão do React Aria): casa pelo fim. */
const endsWith = (label: string | RegExp) =>
  label instanceof RegExp
    ? label
    : new RegExp(`(^|\\s)${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

/** Botão do `Select` do design system pelo rótulo. */
export const selectButton = (label: string | RegExp) =>
  screen.getByRole('button', { name: endsWith(label) });

/** Abre o `Select` com esse rótulo e escolhe a opção pelo texto (como uma pessoa faria). */
export function pick(label: string | RegExp, option: string | RegExp) {
  fireEvent.click(selectButton(label));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }));
}
