import { describe, expect, it } from 'vitest';
import { statLabel, toggleIn } from './toggles';

describe('Checkbox e Stat', () => {
  it('marca e desmarca um item numa lista (ordem preservada, sem repetir)', () => {
    expect(toggleIn(['a', 'b'], 'c', true)).toEqual(['a', 'b', 'c']);
    expect(toggleIn(['a', 'b'], 'a', false)).toEqual(['b']);
    expect(toggleIn(['a', 'b'], 'a', true)).toEqual(['a', 'b']);
    expect(toggleIn(['a'], 'z', false)).toEqual(['a']);
  });

  it('nome acessível do número: "rótulo: valor", com a dica depois', () => {
    expect(statLabel('Vitórias', '3')).toBe('Vitórias: 3');
    expect(statLabel('Pontos', '9', '1º lugar')).toBe('Pontos: 9, 1º lugar');
  });
});
