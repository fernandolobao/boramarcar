import { describe, expect, it } from 'vitest';
import { safeCallback } from './safe-callback';

describe('volta depois do login: só caminhos deste site', () => {
  it('aceita caminhos internos, com busca e âncora', () => {
    expect(safeCallback('/convite/ABCD2345')).toBe('/convite/ABCD2345');
    expect(safeCallback('/eventos?aba=futuros#lista')).toBe('/eventos?aba=futuros#lista');
  });

  it('recusa outro site, inclusive disfarçado com tabulação, quebra de linha ou barra invertida', () => {
    for (const evil of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      '\t//evil.example',
      '/%09/evil.example',
      '/%5C%5Cevil.example',
      'javascript:alert(1)',
    ]) {
      expect(safeCallback(evil), evil).toBe('/painel');
    }
    expect(safeCallback(null)).toBe('/painel');
    expect(safeCallback('', '/inicio')).toBe('/inicio');
  });
});
