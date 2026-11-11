// @vitest-environment jsdom
import { analyzeDeck, type AnalyzableCard } from '@boramarcar/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
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
        <DeckScore analysis={analysis} formatName="Commander" />
        <DeckValidation analysis={analysis} formatName="Commander" />
        <DeckSuggestions analysis={analysis} />
      </>,
    );
    expect(screen.getByTestId('deck-score')).toHaveTextContent(String(analysis.score));
    expect(screen.getByText('O deck tem 4 cartas (esperado: 100).')).toBeInTheDocument();
    // O nome da carta é um botão que abre a carta; a frase continua inteira no item.
    expect(
      screen.getAllByRole('listitem').some((li) => li.textContent === 'Big aparece 2 vezes.'),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Big' })).toHaveAttribute('aria-haspopup', 'dialog');
    const links = screen.getAllByRole('link', { name: /^Buscar substitutos no Scryfall/ });
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringContaining('https://scryfall.com/search?q=id%3C%3Dc%20otag%3Aramp'),
    );
  });
});

describe('formatos sem nota', () => {
  it('explica que a nota vale para formatos com comandante', () => {
    const modern = analyzeDeck(
      [{ name: 'Big', quantity: 4, board: 'mainboard', card: card('Big', 3, 'Creature') }],
      'modern',
    );
    wrap(
      <>
        <DeckScore analysis={modern} formatName="Modern" />
        <DeckValidation analysis={modern} formatName="Modern" />
      </>,
    );
    expect(screen.queryByTestId('deck-score')).toBeNull();
    expect(
      screen.getByText(/A nota por funções vale para formatos com comandante/),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Validação · Modern' })).toBeInTheDocument();
    expect(screen.getByText('O deck tem 4 cartas (mínimo: 60).')).toBeInTheDocument();
  });
});

describe('gráficos interativos (4.11)', () => {
  const audit = async (container: HTMLElement) =>
    (
      await axe.run(container, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      })
    ).violations.map((v) => v.id);

  it('curva: cada barra mostra as cartas daquele custo', async () => {
    const { container } = wrap(
      <ManaCurve curve={analysis.manaCurve} cardsByCurve={analysis.cardsByCurve} />,
    );
    expect(
      screen.getByText('Toque numa barra para ver as cartas desse custo.'),
    ).toBeInTheDocument();
    const seven = screen.getByRole('button', { name: 'Custo 7+: 2 cartas' });
    fireEvent.click(seven);
    expect(seven).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Custo 7+ (2 cartas):')).toBeInTheDocument();
    expect(screen.getByText('Big', { exact: false })).toBeInTheDocument();
    fireEvent.click(seven);
    expect(seven).toHaveAttribute('aria-pressed', 'false');
    expect(await audit(container)).toEqual([]);
  });

  it('nota: cada componente explica o cálculo e lista as cartas', async () => {
    const { container } = wrap(<DeckScore analysis={analysis} formatName="Commander" />);
    const ramp = screen.getByRole('button', { name: /Ramp \(1\)/ });
    expect(ramp).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(ramp);
    expect(ramp).toHaveAttribute('aria-expanded', 'true');
    const panel = within(document.getElementById(ramp.getAttribute('aria-controls')!)!);
    expect(panel.getByText(/Abaixo da meta · meta: 10/)).toBeVisible();
    expect(panel.getByText(/A meta é ter 10 cartas de Ramp/)).toBeVisible();
    expect(panel.getByText('Sol Ring', { exact: false })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Terrenos \(0\)/ }));
    expect(ramp).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/A faixa recomendada é de 36 a 38 terrenos/)).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);
  });
});

describe('banidas', () => {
  it('mostra banidas e a origem da conferência', () => {
    const banned = analyzeDeck([
      {
        name: 'Primeval Titan',
        quantity: 1,
        board: 'mainboard',
        card: { ...card('Primeval Titan', 6, 'Creature')!, legalities: { commander: 'banned' } },
      },
    ]);
    wrap(<DeckValidation analysis={banned} formatName="Commander" />);
    expect(
      screen
        .getAllByRole('listitem')
        .some((li) => li.textContent === 'Primeval Titan é banida neste formato.'),
    ).toBe(true);
    expect(
      screen.getByText(/conferidas pelos dados de legalidade do Scryfall/),
    ).toBeInTheDocument();
  });
});
