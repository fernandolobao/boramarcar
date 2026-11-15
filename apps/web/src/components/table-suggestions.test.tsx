// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { TableSuggestions } from './table-suggestions';

const NAMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gabi', 'Hugo'];
const players = (n: number) => NAMES.slice(0, n).map((name, i) => ({ userId: `u${i}`, name }));

const renderIt = (n: number) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <TableSuggestions players={players(n)} pairs={[]} min={3} max={5} />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('TableSuggestions', () => {
  it('mostra as mesas com os nomes e as duplas novas', () => {
    renderIt(8);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sugestão de mesas' }),
    ).toBeInTheDocument();
    const tables = screen.getAllByRole('listitem').filter((li) => li.querySelector('h3'));
    expect(tables).toHaveLength(2);
    expect(within(tables[0]!).getByRole('heading', { level: 3 })).toHaveTextContent('Mesa 1');
    expect(tables[0]).toHaveTextContent('6 duplas que nunca jogaram juntas');
    const names = tables.flatMap((t) =>
      within(t)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    );
    expect(names.sort()).toEqual([...NAMES].sort());
  });

  it('"Sortear de novo" troca a sugestão e avisa', () => {
    renderIt(8);
    fireEvent.click(screen.getByRole('button', { name: 'Sortear de novo' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nova sugestão de mesas');
  });

  it('com menos de 6 confirmados não aparece', () => {
    const { container } = renderIt(5);
    expect(container).toBeEmptyDOMElement();
  });
});
