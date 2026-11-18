// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckShare } from './deck-share';

afterEach(cleanup);

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

const qr = { svg: '<svg viewBox="0 0 1 1"></svg>', png: 'data:image/png;base64,AA==' };

describe('DeckShare', () => {
  it('deck público: link com copiar, QR Code com baixar e WhatsApp, sem violações', async () => {
    const { container } = wrap(
      <DeckShare
        deck={{ id: 'd1', name: 'Omnath Ramp', visibility: 'public' }}
        url="https://arcanakin.com.br/decks/d1"
        qr={qr}
      />,
    );
    expect(screen.getByText('Compartilhar deck')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Link do deck' })).toHaveValue(
      'https://arcanakin.com.br/decks/d1',
    );
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR Code do deck Omnath Ramp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Baixar QR Code' })).toHaveAttribute(
      'download',
      'deck-omnath-ramp.png',
    );
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('https://arcanakin.com.br/decks/d1')),
    );
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('deck do grupo ou privado: não aparece', () => {
    const { container } = wrap(
      <DeckShare
        deck={{ id: 'd1', name: 'Omnath Ramp', visibility: 'group' }}
        url="https://arcanakin.com.br/decks/d1"
        qr={qr}
      />,
    );
    expect(container.querySelector('main')).toBeEmptyDOMElement();
  });
});
