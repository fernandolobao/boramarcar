// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { OpeningHand, type OpeningHandLine } from './opening-hand';

const lines: OpeningHandLine[] = [
  { name: 'Omnath', board: 'commander', quantity: 1, isLand: false, imageUri: null },
  { name: 'Forest', board: 'mainboard', quantity: 40, isLand: true, imageUri: null },
  { name: 'Cultivate', board: 'mainboard', quantity: 59, isLand: false, imageUri: null },
];
const show = (l = lines) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <OpeningHand lines={l} />
    </NextIntlClientProvider>,
  );
const status = () => screen.getByRole('status').textContent ?? '';
const handSize = () => screen.getAllByRole('listitem').length;

afterEach(cleanup);

describe('OpeningHand (11.3)', () => {
  it('compra 7, diz quantos terrenos vieram e compra a próxima', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Comprar mão inicial' }));
    expect(handSize()).toBe(7);
    expect(status()).toMatch(/^7 cartas na mão, (nenhum terreno|1 terreno|\d terrenos)\.$/);
    fireEvent.click(screen.getByRole('button', { name: 'Comprar carta' }));
    expect(handSize()).toBe(8);
  });

  it('mulligan: escolhe 1 carta para o fundo e mantém 6', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Comprar mão inicial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }));
    expect(status()).toContain('Mulligan 1: escolha 1 carta');
    const keep = screen.getByRole('button', { name: 'Manter com 6 cartas' });
    expect(keep).toBeDisabled();
    // Comprar fica bloqueado enquanto a escolha não termina.
    expect(screen.getByRole('button', { name: 'Comprar carta' })).toBeDisabled();
    const first = within(screen.getAllByRole('listitem')[0]!).getByRole('button');
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(keep);
    expect(handSize()).toBe(6);
    expect(status()).toContain('(depois de 1 mulligan)');
  });

  it('deck com menos de 7 cartas no deck principal: avisa em vez de comprar', () => {
    show([{ name: 'Forest', board: 'mainboard', quantity: 3, isLand: true, imageUri: null }]);
    expect(screen.getByText(/pelo menos 7 cartas/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
