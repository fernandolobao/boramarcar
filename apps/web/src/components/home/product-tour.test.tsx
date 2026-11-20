// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { ProductTour } from './product-tour';

const renderTour = () =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <ProductTour />
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

describe('ProductTour', () => {
  it('mostra uma aba por tela, começando pelo painel', () => {
    renderTour();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Painel',
      'Agenda',
      'Análise de deck',
      'Coleção',
      'Modo mesa',
      'Ranking',
      'Torneio',
      'Lojas perto',
      'Página da loja',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0]!.id);
  });

  it('troca de tela pelas setas e vai ao fim com End', () => {
    renderTour();
    const first = screen.getByRole('tab', { name: 'Painel' });
    act(() => first.focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Agenda' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/mesa fecha/i);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Página da loja' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('cada tela tem a captura clara e a escura com o mesmo texto alternativo', () => {
    renderTour();
    const images = screen.getByRole('tabpanel').querySelectorAll('img');
    expect(images).toHaveLength(2);
    const [light, dark] = [...images];
    expect(light!.getAttribute('src')).toContain('painel-light.webp');
    expect(dark!.getAttribute('src')).toContain('painel-dark.webp');
    expect(light!.alt).toBe(dark!.alt);
    expect(light!.alt.length).toBeGreaterThan(30);
  });
});
