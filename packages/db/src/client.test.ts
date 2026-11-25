import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDb } from './client';

describe('pool do banco (produção)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('erro numa conexão parada (o Neon derruba as ociosas) é registrado, sem derrubar o processo', async () => {
    const { pool } = createDb('postgres://u:p@127.0.0.1:1/x');
    expect(pool.listenerCount('error')).toBeGreaterThan(0);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    pool.emit('error', new Error('Connection terminated unexpectedly'), {} as never);
    expect(log).toHaveBeenCalled();
    await pool.end();
  });

  it('tempo limite para conectar, conexões ociosas e consultas', async () => {
    const { pool } = createDb('postgres://u:p@127.0.0.1:1/x');
    const options = pool.options as unknown as Record<string, unknown>;
    expect(options.connectionTimeoutMillis).toBe(5_000);
    expect(options.idleTimeoutMillis).toBe(10_000);
    expect(options.statement_timeout).toBe(15_000);
    await pool.end();
  });
});
