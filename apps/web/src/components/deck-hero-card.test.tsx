// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckHeroCard } from './deck-hero-card';

afterEach(cleanup);

const renderCard = (props: Partial<Parameters<typeof DeckHeroCard>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <DeckHeroCard
        name="Esika, Queen of Myriad"
        imageUri="https://cards.scryfall.io/front.jpg"
        {...props}
      />
    </NextIntlClientProvider>,
  );

describe('DeckHeroCard', () => {
  it('carta de uma face não tem botão de virar', () => {
    renderCard();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Esika, Queen of Myriad' })).toBeInTheDocument();
  });

  it('carta de duas faces vira (estado no aria-pressed e texto alternativo da face)', () => {
    renderCard({
      backImageUri: 'https://cards.scryfall.io/back.jpg',
      backName: 'The Prismatic Bridge',
    });
    const button = screen.getByRole('button', { name: /Virar/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'The Prismatic Bridge' })).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByRole('img', { name: 'Esika, Queen of Myriad' })).toBeInTheDocument();
  });
});
