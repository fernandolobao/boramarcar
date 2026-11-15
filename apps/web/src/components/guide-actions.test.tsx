// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { GuideFinish, GuideHeading, GuideSkip } from './guide-actions';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe('guia do primeiro acesso', () => {
  it('"Pular o guia" grava a escolha e vai ao painel (ou ao grupo, sem grupo)', async () => {
    const fetchMock = vi.fn(async () => Response.json({ flag: 'guide-skipped' }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<GuideSkip hasGroup={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pular o guia' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/grupo'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/onboarding',
      expect.objectContaining({ body: JSON.stringify({ flag: 'guide-skipped' }) }),
    );
  });

  it('"Ir para o painel" marca o guia como concluído', async () => {
    const fetchMock = vi.fn(async () => Response.json({ flag: 'guide-completed' }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<GuideFinish />);
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o painel' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/painel'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/onboarding',
      expect.objectContaining({ body: JSON.stringify({ flag: 'guide-completed' }) }),
    );
  });

  it('o título do passo recebe o foco ao abrir', () => {
    wrap(<GuideHeading>Seu grupo</GuideHeading>);
    const heading = screen.getByRole('heading', { level: 1, name: 'Seu grupo' });
    expect(document.activeElement).toBe(heading);
  });
});
