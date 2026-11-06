// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import messages from '../../messages/pt-BR.json';
import { ColorPips } from './deck-analysis';
import { manaClass, ManaCost, parseManaCost } from './mana';

afterEach(cleanup);

describe('símbolos de mana', () => {
  it('converte símbolos do Scryfall para classes do Mana Font', () => {
    expect(parseManaCost('{2}{G}{W/U}{G/P}{X}')).toEqual(['2', 'G', 'W/U', 'G/P', 'X']);
    expect(parseManaCost(null)).toEqual([]);
    expect(
      ['W', '10', 'W/U', 'R/W/P', '2/B', 'C/G', 'U/P', 'S', 'X', 'C', 'T', 'Q', 'HW', '99'].map(
        manaClass,
      ),
    ).toEqual([
      'ms-w',
      'ms-10',
      'ms-wu',
      'ms-rwp',
      'ms-2b',
      'ms-cg',
      'ms-up',
      'ms-s',
      'ms-x',
      'ms-c',
      'ms-tap',
      'ms-untap',
      null,
      null,
    ]);
  });

  it('ManaCost tem nome por extenso e símbolos decorativos', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <ManaCost cost="{2}{W/U}{G/P}" />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole('img', { name: 'Custo de mana: 2, branco ou azul, verde phyrexiano' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('i.ms[aria-hidden="true"]')).toHaveLength(3);
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it('em inglês e sem custo', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ManaCost cost="{1}{B}" />
        <ManaCost cost="" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('img', { name: 'Mana cost: 1, black' })).toBeInTheDocument();
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1);
  });

  it('símbolos de mana do deck mostram ícone, quantidade e nome da cor', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <main>
          <ColorPips pips={{ W: 64, U: 8, B: 27, R: 0, G: 0, C: 0 }} />
        </main>
      </NextIntlClientProvider>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['64branco', '8azul', '27preto']);
    expect(items[2]!.querySelector('i.ms-b')).not.toBeNull();
    // Barra proporcional: três segmentos com flex-grow igual à contagem.
    const segments = container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div');
    expect([...segments].map((d) => d.style.flexGrow)).toEqual(['64', '8', '27']);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
