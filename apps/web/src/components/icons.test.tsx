// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon, Icons } from './icons';

afterEach(cleanup);

describe('Icon', () => {
  it('é decorativo: escondido de leitores de tela e fora da ordem de foco', () => {
    const { container } = render(
      <button type="button">
        <Icon name="delete" />
        Remover
      </button>,
    );
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveClass('size-4');
    // O nome acessível do botão continua sendo só o texto
    expect(screen.getByRole('button')).toHaveAccessibleName('Remover');
  });

  it('todos os ícones do mapa existem', () => {
    for (const [name, Component] of Object.entries(Icons)) {
      expect(Component, name).toBeTruthy();
    }
  });
});
