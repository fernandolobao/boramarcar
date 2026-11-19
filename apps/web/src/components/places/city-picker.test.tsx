// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { CityPicker } from './city-picker';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const results = [
  { code: '4106902', name: 'Curitiba', uf: 'PR', slug: 'curitiba' },
  { code: '4125506', name: 'São José dos Pinhais', uf: 'PR', slug: 'sao-jose-dos-pinhais' },
];

describe('seletor de cidade (10.3)', () => {
  it('busca pelo nome, mostra cidade e UF e devolve o município escolhido', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ municipalities: results })));
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <CityPicker label="Cidade" value={null} onChange={onChange} />
      </NextIntlClientProvider>,
    );
    const input = screen.getByRole('combobox', { name: 'Cidade' });
    fireEvent.change(input, { target: { value: 'curi' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/municipalities?q=curi');
    const option = await screen.findByRole('option', { name: 'Curitiba, PR' });
    fireEvent.mouseDown(option);
    expect(onChange).toHaveBeenCalledWith(results[0]);
  });

  it('mostra a cidade já escolhida', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <CityPicker label="Cidade" value={results[0]!} onChange={() => {}} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toHaveValue('Curitiba, PR');
  });
});
