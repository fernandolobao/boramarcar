import { describe, expect, it, vi } from 'vitest';
import { buildTagQueries, fetchCardRoles } from './tagger';

describe('Scryfall Tagger', () => {
  it('divide os nomes em buscas de até 1000 caracteres', () => {
    const names = Array.from({ length: 80 }, (_, i) => `Carta Com Nome Bem Comprido ${i}`);
    const queries = buildTagQueries('ramp', names);
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((q) => q.length <= 1000)).toBe(true);
    expect(queries[0]).toMatch(/^otag:ramp \(!"Carta Com Nome Bem Comprido 0" or /);
    expect(queries.join(' ').match(/!"/g)).toHaveLength(80);
    expect(buildTagQueries('x', ['Say "Hi"'])).toEqual(['otag:x (!"Say Hi")']);
  });

  it('marca as funções de cada carta (inclusive dupla face) e ignora 404', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const q = decodeURIComponent(new URL(url).searchParams.get('q')!);
      if (q.startsWith('otag:ramp')) return Response.json({ data: [{ name: 'Sol Ring' }] });
      if (q.startsWith('otag:card-advantage'))
        return Response.json({
          data: [{ name: 'Sol Ring' }, { name: 'Valki, God of Lies // Tibalt, Cosmic Impostor' }],
        });
      return new Response('{"object":"error"}', { status: 404 });
    });
    const roles = await fetchCardRoles(['Sol Ring', 'Valki, God of Lies', 'Forest'], {
      fetch: fetchMock,
      delayMs: 0,
    });
    expect(roles.get('sol ring')).toEqual(['ramp', 'draw']);
    expect(roles.get('valki, god of lies')).toEqual(['draw']);
    expect(roles.get('forest')).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(8);
    await expect(
      fetchCardRoles(['X'], { fetch: async () => new Response('x', { status: 429 }), delayMs: 0 }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });
});
