// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HeroArt } from './hero-art';

afterEach(cleanup);

describe('HeroArt (arte de fundo do destaque)', () => {
  it('é uma imagem de prioridade alta, direto do Scryfall, fora da leitura', () => {
    const src = 'https://cards.scryfall.io/art_crop/front/8/a/x.jpg?1';
    const { container } = render(
      <section className="relative">
        <HeroArt src={src} />
      </section>,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    // Sem o otimizador (o Scryfall recusa pedidos sem User-Agent): a URL original.
    expect(img.getAttribute('src')).toBe(src);
    expect(img.getAttribute('loading')).not.toBe('lazy');
  });
});
