// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn(async () => ({}));
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...(args as [])) }));

const { LocaleSync } = await import('./locale-sync');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LocaleSync', () => {
  it('sem cookie (ex.: preview novo), grava o idioma salvo no perfil', async () => {
    render(<LocaleSync savedLocale="pt-BR" hasCookie={false} />);
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/api/v1/me/preferences', {
        method: 'PUT',
        body: { locale: 'pt-BR' },
      }),
    );
  });

  it('com cookie (escolha deste navegador) ou sem idioma salvo, não faz nada', () => {
    render(<LocaleSync savedLocale="pt-BR" hasCookie />);
    render(<LocaleSync savedLocale={null} hasCookie={false} />);
    expect(api).not.toHaveBeenCalled();
  });
});
