import { describe, expect, it } from 'vitest';
import { nextChoice } from './choices';

describe('escolhas do Choices', () => {
  const opts = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B', disabled: true },
    { value: 'c', label: 'C' },
  ] as const;

  it('anda pelas opções pulando as desabilitadas e dá a volta', () => {
    expect(nextChoice(opts, 'a', 1)).toBe('c');
    expect(nextChoice(opts, 'c', 1)).toBe('a');
    expect(nextChoice(opts, 'a', -1)).toBe('c');
  });

  it('sem escolha, começa na primeira habilitada; sem opções habilitadas, null', () => {
    expect(nextChoice(opts, null, 1)).toBe('a');
    expect(nextChoice([{ value: 'x', label: 'X', disabled: true }], null, 1)).toBeNull();
  });
});
