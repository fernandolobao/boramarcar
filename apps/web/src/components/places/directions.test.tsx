// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { DirectionsLinks } from './directions';

const place = { name: 'Casa da Ana', address: 'Rua A, 1', lat: -30, lng: -51 };
const show = (collapsible: boolean) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <DirectionsLinks place={place} collapsible={collapsible} />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('DirectionsLinks', () => {
  it('na lista de locais, os apps de mapa ficam atrás de "Como chegar"', () => {
    show(true);
    const button = screen.getByRole('button', { name: /^Como chegar ?\(Casa da Ana\)$/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /Google Maps/ })).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Google Maps/ })).toBeVisible();
  });

  it('sozinho (encontro, loja): os quatro apps à vista', () => {
    show(false);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });
});
