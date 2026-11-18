// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { NewAchievements } from './new-achievements';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

describe('NewAchievements', () => {
  it('abre sozinha com todas as conquistas novas juntas e marca como vistas ao fechar', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(
      <NewAchievements
        achievements={[
          { id: 'first_win', unlockedAt: '2026-11-10T22:00:00.000Z' },
          { id: 'streak_3', unlockedAt: '2026-11-17T22:00:00.000Z' },
        ]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: '2 conquistas novas!' });
    expect(within(dialog).getByText('Primeira vitória')).toBeInTheDocument();
    expect(within(dialog).getByText('Embalado')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Ver todas no perfil' })).toHaveAttribute(
      'href',
      '/perfil',
    );
    const results = await axe.run(dialog, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Legal!' }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/achievements/seen',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['first_win', 'streak_3'] }),
      }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sem conquistas novas, não mostra nada', () => {
    const { container } = wrap(<NewAchievements achievements={[]} />);
    expect(container.querySelector('dialog')).toBeNull();
  });
});
