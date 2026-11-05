// @vitest-environment jsdom
import { analyzeDeck, type AnalyzableCard } from '@boramarcar/core';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckScore, DeckSuggestions, DeckValidation, ManaCurve } from './deck-analysis';

afterEach(cleanup);

const wrap = (node: ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      {node}
    </NextIntlClientProvider>,
  );

const card = (
  name: string,
  cmc: number,
  typeLine = 'Artifact',
  oracleText = '',
): AnalyzableCard['card'] => ({
  scryfallId: name,
  name,
  cmc,
  typeLine,
  oracleText,
  manaCost: `{${cmc}}`,
  colors: [],
  colorIdentity: [],
});

const analysis = analyzeDeck([
  {
    name: 'Commander',
    quantity: 1,
    board: 'commander',
    card: card('Commander', 4, 'Legendary Creature'),
  },
  {
    name: 'Sol Ring',
    quantity: 1,
    board: 'mainboard',
    card: card('Sol Ring', 1, 'Artifact', '{T}: Add {C}{C}.'),
  },
  { name: 'Big', quantity: 2, board: 'mainboard', card: card('Big', 7, 'Creature') },
]);

describe('ManaCurve', () => {
  it('desenha uma barra por faixa com altura proporcional', () => {
    wrap(<ManaCurve curve={analysis.manaCurve} />);
    expect(screen.getByText('Curva de mana')).toBeInTheDocument();
    expect(screen.getByTestId('curve-bar-7+')).toHaveStyle({ height: '100%' });
    expect(screen.getByTestId('curve-bar-1')).toHaveStyle({ height: '50%' });
    expect(screen.getByTestId('curve-bar-3')).toHaveStyle({ height: '0%' });
  });
});

describe('DeckScore / DeckValidation / DeckSuggestions', () => {
  it('mostra a nota, problemas e links de busca no Scryfall', () => {
    wrap(
      <>
        <DeckScore analysis={analysis} />
        <DeckValidation analysis={analysis} />
        <DeckSuggestions analysis={analysis} />
      </>,
    );
    expect(screen.getByTestId('deck-score')).toHaveTextContent(String(analysis.score));
    expect(screen.getByText('O deck tem 4 cartas (esperado: 100).')).toBeInTheDocument();
    expect(screen.getByText('Big aparece 2 vezes.')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Buscar substitutos no Scryfall' });
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringContaining('https://scryfall.com/search?q=id%3C%3Dc%20otag%3Aramp'),
    );
  });
});
