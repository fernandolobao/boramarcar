import { afterEach, describe, expect, it, vi } from 'vitest';
import { getUsdBrlRate, resetRateCache } from './exchange-rate';

const ok = (rate: number) =>
  vi.fn(async () =>
    Response.json({ value: [{ cotacaoVenda: rate, dataHoraCotacao: '2026-11-05 13:00:00.000' }] }),
  );

afterEach(() => {
  resetRateCache();
  vi.useRealTimers();
});

describe('cotação com cache', () => {
  it('busca uma vez, reaproveita por 6 h e cai para a última conhecida se o BCB falhar', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-06T12:00:00Z') });
    const first = ok(5.4);
    expect(
      await getUsdBrlRate({ db: null, fetch: first as unknown as typeof fetch }),
    ).toMatchObject({ rate: 5.4 });
    expect(
      await getUsdBrlRate({ db: null, fetch: first as unknown as typeof fetch }),
    ).toMatchObject({ rate: 5.4 });
    expect(first).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-11-06T19:00:00Z'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn(async () => new Response('x', { status: 503 }));
    expect(
      await getUsdBrlRate({ db: null, fetch: failing as unknown as typeof fetch }),
    ).toMatchObject({ rate: 5.4 });
    expect(failing).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('sem cotação nenhuma, devolve null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn(async () => {
      throw new Error('rede');
    });
    expect(await getUsdBrlRate({ db: null, fetch: failing as unknown as typeof fetch })).toBeNull();
    warn.mockRestore();
  });
});
