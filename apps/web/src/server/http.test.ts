import { DomainError } from '@boramarcar/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/nextjs', () => sentry);

import { errorResponse, isoDate, parseJson, parseQuery } from './http';

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

  it('datas: só entre 2000 e 2100 (nada de ano 200000 para travar laços)', () => {
    expect(isoDate.safeParse('2026-11-20T10:00:00Z').success).toBe(true);
    expect(isoDate.safeParse('+200000-01-01T00:00:00Z').success).toBe(false);
    expect(isoDate.safeParse('-200000-01-01T00:00:00Z').success).toBe(false);
    expect(isoDate.safeParse('1990-01-01').success).toBe(false);
  });

  it('chave única repetida (pedido em dobro) vira 409, não 500', async () => {
    const error = Object.assign(new Error('Failed query: insert into ...'), {
      cause: Object.assign(new Error('duplicate key value'), { code: '23505' }),
    });
    const res = errorResponse(error);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('conflict');
  });

  it('erro inesperado vai ao Sentry e ao log sem os parâmetros da consulta (e-mails, nomes)', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(
      new Error('Failed query: select * from "user" where email = $1\nparams: ana@exemplo.test'),
      { cause: Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }) },
    );
    const res = errorResponse(error);
    expect(res.status).toBe(500);
    const sentToSentry = sentry.captureException.mock.calls.at(-1)![0] as Error;
    expect(sentToSentry.message).not.toContain('ana@exemplo.test');
    expect(sentToSentry.message).toContain('ECONNRESET');
    expect(JSON.stringify(log.mock.calls)).not.toContain('ana@exemplo.test');
    log.mockRestore();
  });
});
