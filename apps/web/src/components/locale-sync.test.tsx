// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
const api = vi.fn(async () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...(args as [])) }));

const { LocaleSync } = await import('./locale-sync');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LocaleSync', () => {
  it('volta para o idioma salvo quando o da página é outro (ex.: preview sem cookie)', async () => {
    render(<LocaleSync savedLocale="pt-BR" currentLocale="en" />);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('/api/v1/me/preferences', {
      method: 'PUT',
      body: { locale: 'pt-BR' },
    });
  });

  it('não faz nada se já está no idioma salvo ou se não há idioma salvo', () => {
    render(<LocaleSync savedLocale="pt-BR" currentLocale="pt-BR" />);
    render(<LocaleSync savedLocale={null} currentLocale="en" />);
    expect(api).not.toHaveBeenCalled();
  });
});
