import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { cachedExternal, consumeRateLimit, purgeExternalData } from './external';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const at = (iso: string) => new Date(iso);

describe('cachedExternal', () => {
  it('guarda, reaproveita dentro da validade e renova depois', async () => {
    const load = vi.fn(async () => ({ rate: 5.4 }));
    const t0 = at('2026-11-11T12:00:00Z');
    expect(await cachedExternal(db, 'ptax', 60_000, load, t0)).toEqual({ rate: 5.4 });
    expect(await cachedExternal(db, 'ptax', 60_000, load, at('2026-11-11T12:00:30Z'))).toEqual({
      rate: 5.4,
    });
    expect(load).toHaveBeenCalledTimes(1);

    load.mockResolvedValueOnce({ rate: 5.5 });
    expect(await cachedExternal(db, 'ptax', 60_000, load, at('2026-11-11T12:02:00Z'))).toEqual({
      rate: 5.5,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('serviço fora do ar: usa o valor vencido; sem valor nenhum, repassa o erro', async () => {
    await cachedExternal(db, 'prints:sol', 1000, async () => ['a'], at('2026-01-01T00:00:00Z'));
    const failing = async () => {
      throw new Error('fora do ar');
    };
    expect(
      await cachedExternal(db, 'prints:sol', 1000, failing, at('2026-02-01T00:00:00Z')),
    ).toEqual(['a']);
    await expect(cachedExternal(db, 'nada', 1000, failing)).rejects.toThrow('fora do ar');
  });
});

describe('consumeRateLimit', () => {
  it('conta por janela e recusa acima do limite, dizendo quando tentar de novo', async () => {
    const options = { limit: 2, windowMs: 60_000 };
    const now = at('2026-11-11T12:00:10Z');
    await consumeRateLimit(db, 'import:ana', options, now);
    await consumeRateLimit(db, 'import:ana', options, now);
    await expect(consumeRateLimit(db, 'import:ana', options, now)).rejects.toMatchObject({
      code: 'rate_limited',
      details: { retryAfterSeconds: 50 },
    });
    // Outra pessoa e a janela seguinte não são afetadas.
    await consumeRateLimit(db, 'import:bia', options, now);
    await consumeRateLimit(db, 'import:ana', options, at('2026-11-11T12:01:00Z'));
  });
});

describe('purgeExternalData', () => {
  it('apaga cache vencido há muito tempo e janelas antigas', async () => {
    await cachedExternal(db, 'velho', 1000, async () => 1, at('2025-01-01T00:00:00Z'));
    await cachedExternal(db, 'novo', 1000, async () => 1, at('2026-11-11T00:00:00Z'));
    await consumeRateLimit(db, 'x', { limit: 9, windowMs: 60_000 }, at('2026-11-01T00:00:00Z'));
    const result = await purgeExternalData(db, {}, at('2026-11-11T12:00:00Z'));
    expect(result.cache).toBeGreaterThanOrEqual(1);
    expect(result.rateLimits).toBeGreaterThanOrEqual(1);
    expect(
      await cachedExternal(db, 'novo', 1000, async () => 2, at('2026-11-11T00:00:00.5Z')),
    ).toBe(1);
  });
});
