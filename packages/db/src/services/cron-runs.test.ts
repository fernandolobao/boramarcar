import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { onceFor } from './cron-runs';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('tarefas de cron uma vez por período', () => {
  it('a segunda execução no mesmo período é pulada; outro período roda', async () => {
    let sent = 0;
    const send = async () => ++sent;
    expect(await onceFor(db, 'metrics', '2026-11-23', send)).toEqual({ skipped: false, result: 1 });
    expect(await onceFor(db, 'metrics', '2026-11-23', send)).toEqual({ skipped: true });
    expect(await onceFor(db, 'metrics', '2026-11-30', send)).toEqual({ skipped: false, result: 2 });
  });

  it('dois crons ao mesmo tempo: só um manda', async () => {
    let sent = 0;
    const results = await Promise.all(
      [1, 2].map(() => onceFor(db, 'news', '2026-11-23', async () => ++sent)),
    );
    expect(sent).toBe(1);
    expect(results.filter((r) => r.skipped)).toHaveLength(1);
  });

  it('se falhar, a marca sai e a próxima execução tenta de novo', async () => {
    await expect(
      onceFor(db, 'recap', '2026-11', async () => {
        throw new Error('Resend fora do ar');
      }),
    ).rejects.toThrow('Resend fora do ar');
    expect(await onceFor(db, 'recap', '2026-11', async () => 'ok')).toEqual({
      skipped: false,
      result: 'ok',
    });
  });
});
