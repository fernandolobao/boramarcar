// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { CHALLENGES } from '@boramarcar/core/learn';
import { ChallengeQuiz } from './challenge-quiz';

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

const voar = CHALLENGES[0]!['pt-BR'];

describe('ChallengeQuiz (12.4)', () => {
  it('resposta errada comenta e deixa tentar de novo; certa salva o progresso', async () => {
    const fetchMock = vi.fn(async () => Response.json({ completed: ['desafio-voar'] }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(
      <ChallengeQuiz
        challengeId="desafio-voar"
        question={voar.question}
        options={voar.options}
        signedIn
      />,
    );
    expect((await axe.run(container)).violations).toEqual([]);
    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: 'Bloqueio com Grizzly Bears.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não.');
    expect(screen.getByRole('status')).toHaveTextContent(/só pode ser bloqueada por quem tem voar/);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'Não bloqueio e perco 4 de vida.' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Certo!');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/learn',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(
      await screen.findByText('Desafio resolvido e salvo no seu progresso.'),
    ).toBeInTheDocument();
  });

  it('sem conta: acerta, mas não salva', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    wrap(
      <ChallengeQuiz
        challengeId="desafio-voar"
        question={voar.question}
        options={voar.options}
        signedIn={false}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Não bloqueio e perco 4 de vida.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByRole('status')).toHaveTextContent('Certo!');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
