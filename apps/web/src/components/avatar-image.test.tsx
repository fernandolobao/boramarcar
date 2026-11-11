// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AvatarImage, initialsOf } from './avatar-image';

afterEach(cleanup);

describe('AvatarImage', () => {
  it('mostra a foto e cai para as iniciais se ela não carregar', () => {
    const { container } = render(
      <span>
        <AvatarImage name="Ana Teste" image="https://lh3.googleusercontent.com/a/x" sizes="32px" />
      </span>,
    );
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(img).toHaveAttribute('alt', '');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AT')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sem foto, mostra as iniciais', () => {
    render(<AvatarImage name="  bia  " image={null} sizes="32px" />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(initialsOf('Caio de Souza Lima')).toBe('CD');
  });
});
