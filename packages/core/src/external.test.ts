import { describe, expect, it, vi } from 'vitest';
import { DomainError } from './errors';
import { readJsonLimited, withTimeout } from './external';

describe('withTimeout', () => {
  it('passa a resposta adiante e manda um signal', async () => {
    const fetchFn = vi.fn(async () => new Response('ok'));
    const response = await withTimeout(
      fetchFn,
      1000,
      'Teste',
    )('https://x.test', { method: 'POST' });
    expect(await response.text()).toBe('ok');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://x.test',
      expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }),
    );
  });

  it('sem resposta a tempo vira upstream_error com o nome do serviço', async () => {
    const slow = (_: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)),
      );
    await expect(withTimeout(slow, 20, 'Scryfall')('https://x.test')).rejects.toMatchObject({
      code: 'upstream_error',
      message: 'Scryfall não respondeu em 0.02 s',
      details: { service: 'Scryfall', timeout: true },
    });
  });

  it('erro de rede vira upstream_error; DomainError passa como está', async () => {
    const offline = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(withTimeout(offline, 1000, 'PTAX')('https://x.test')).rejects.toMatchObject({
      code: 'upstream_error',
      details: { timeout: false },
    });
    const domain = async () => {
      throw new DomainError('not_found');
    };
    await expect(withTimeout(domain, 1000, 'PTAX')('https://x.test')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('respeita o signal de quem chamou', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(async (_: string, init?: RequestInit) => {
      controller.abort();
      expect(init?.signal?.aborted).toBe(true);
      return new Response('ok');
    });
    await withTimeout(fetchFn, 1000, 'X')('https://x.test', { signal: controller.signal });
  });
});

describe('readJsonLimited', () => {
  it('lê o JSON dentro do limite', async () => {
    expect(await readJsonLimited(Response.json({ ok: 1 }), { service: 'X' })).toEqual({ ok: 1 });
  });

  it('recusa pelo Content-Length e, sem ele, para de ler no limite', async () => {
    const big = new Response('{}', { headers: { 'content-length': '999999' } });
    await expect(readJsonLimited(big, { service: 'X', maxBytes: 100 })).rejects.toMatchObject({
      code: 'upstream_error',
    });
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(64)));
      },
    });
    await expect(
      readJsonLimited(new Response(stream), { service: 'X', maxBytes: 200 }),
    ).rejects.toThrow('grandes demais');
  });

  it('resposta que não é JSON vira upstream_error', async () => {
    await expect(readJsonLimited(new Response('<html>'), { service: 'X' })).rejects.toThrow(
      'não é JSON',
    );
  });
});
