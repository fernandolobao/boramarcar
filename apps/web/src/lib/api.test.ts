import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('envia JSON e retorna o corpo', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/api/v1/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/x',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('retorna undefined para 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await expect(api('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('lança ApiError com o código do servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: { code: 'forbidden', message: 'não' } }, { status: 403 }),
      ),
    );
    const error = await api('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'forbidden', message: 'não' });
  });

  it('trata respostas sem JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500, statusText: 'Server Error' })),
    );
    await expect(api('/x')).rejects.toMatchObject({ code: 'internal_error', status: 500 });
  });
});
