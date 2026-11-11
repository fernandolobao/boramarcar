import { DomainError } from '@boramarcar/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorResponse, parseJson, parseQuery } from './http';

describe('errorResponse', () => {
  it.each([
    ['invalid_input', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['conflict', 409],
    ['upstream_error', 502],
  ] as const)('mapeia %s para %i', async (code, status) => {
    const res = errorResponse(new DomainError(code, 'msg'));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: { code, message: 'msg' } });
  });

  it('limite de uso: 429 com Retry-After', async () => {
    const res = errorResponse(
      new DomainError('rate_limited', 'Muitas tentativas', { retryAfterSeconds: 42 }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });

  it('converte ZodError em 400 com detalhes', async () => {
    const result = z.object({ a: z.string() }).safeParse({ a: 1 });
    const res = errorResponse(result.error);
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; details: { fieldErrors: Record<string, unknown> } };
    };
    expect(body.error.code).toBe('invalid_input');
    expect(body.error.details.fieldErrors.a).toBeDefined();
  });

  it('esconde erros inesperados', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(new Error('segredo'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('segredo');
    spy.mockRestore();
  });
});

describe('parse helpers', () => {
  it('lê JSON e query string com zod', async () => {
    const req = new Request('http://x/?n=3', { method: 'POST', body: '{"a":"b"}' });
    await expect(parseJson(req, z.object({ a: z.string() }))).resolves.toEqual({ a: 'b' });
    expect(parseQuery(req, z.object({ n: z.coerce.number() }))).toEqual({ n: 3 });
  });

  it('rejeita JSON malformado', async () => {
    const req = new Request('http://x/', { method: 'POST', body: '{' });
    await expect(parseJson(req, z.any())).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
