// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckComparisonCard } from './deck-comparison';

afterEach(cleanup);

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      {ui}
    </NextIntlClientProvider>,
  );

describe('DeckComparisonCard', () => {
  it('mostra a tabela com diferenças, cartas comuns e o link do EDHREC', () => {
    wrap(
      <DeckComparisonCard
        commanders={['Omnath, Locus of Mana']}
        edhrecUrl="https://edhrec.com/commanders/omnath-locus-of-mana"
        leastPopular={[{ name: 'Rara', rank: 20000 }]}
        comparison={{
          decks: 2,
          metrics: [
            { key: 'score', value: 60, average: 75 },
            { key: 'lands', value: 36, average: 36 },
            { key: 'ramp', value: 12, average: 10.5 },
          ],
          commonMissing: [{ name: 'Arcane Signet', share: 1 }],
          unique: ['Minha Carta'],
        }}
      />,
    );
    const table = screen.getByRole('table', { name: 'Este deck × média de 2 decks' });
    expect(table).toHaveTextContent('Nota6075−15');
    expect(table).toHaveTextContent('Terrenos3636igual');
    expect(table).toHaveTextContent('Ramp1210,5+1,5');
    expect(screen.getByText(/em 100% dos decks/)).toBeInTheDocument();
    expect(screen.getByText('Minha Carta')).toBeInTheDocument();
    expect(screen.getByText(/nº 20.000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver o comandante no EDHREC/ })).toHaveAttribute(
      'href',
      'https://edhrec.com/commanders/omnath-locus-of-mana',
    );
  });

  it('sem outros decks, explica', () => {
    wrap(
      <DeckComparisonCard
        commanders={['Omnath']}
        edhrecUrl={null}
        leastPopular={[]}
        comparison={null}
      />,
    );
    expect(
      screen.getByText('Ainda não há outros decks de Omnath no ArcanaKin para comparar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
