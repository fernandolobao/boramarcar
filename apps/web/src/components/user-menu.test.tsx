// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { MemberActions } from './member-actions';
import { UserMenu } from './user-menu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/painel',
}));
afterEach(cleanup);

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );
const audit = async (el: HTMLElement) =>
  (
    await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })
  ).violations.map((v) => v.id);

describe('UserMenu', () => {
  it('abre com perfil, configurações e sair; fecha com Esc e clique fora', async () => {
    const { container } = wrap(<UserMenu name="Ana Teste" email="ana@x.com" image={null} />);
    const button = screen.getByRole('button', { name: /Ana/ });
    expect(button).toHaveAccessibleName(/^Ana ?\(Menu da conta\)$/);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Perfil' })).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'href',
      '/configuracoes',
    );
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();

    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('MemberActions', () => {
  it('ações ficam recolhidas atrás de "Gerenciar"', async () => {
    const { container } = wrap(
      <ul>
        <li>
          <MemberActions
            groupId="g"
            actorId="a"
            actorRole="owner"
            member={{ userId: 'b', name: 'Bia', role: 'member' }}
            memberCount={2}
          />
        </li>
      </ul>,
    );
    const manage = screen.getByRole('button', { name: /Gerenciar/ });
    expect(manage).toHaveAccessibleName(/^Gerenciar ?\(Bia\)$/);
    expect(screen.queryByRole('group', { name: 'Ações para Bia' })).not.toBeInTheDocument();
    fireEvent.click(manage);
    expect(manage).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Ações para Bia' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Tornar admin ?\(Bia\)$/ })).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);
  });
});
