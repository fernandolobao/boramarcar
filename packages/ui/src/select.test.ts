import { describe, expect, it } from 'vitest';
import { selectedOption } from './select';

describe('Select', () => {
  const opts = [
    { value: '', label: 'Todos' },
    { value: 'modern', label: 'Modern' },
    { value: 'pauper', label: 'Pauper', disabled: true },
  ] as const;

  it('acha a opção escolhida (inclusive a de valor vazio, "Todos")', () => {
    expect(selectedOption(opts, 'modern')?.label).toBe('Modern');
    expect(selectedOption(opts, '')?.label).toBe('Todos');
  });

  it('sem escolha ou valor que não está na lista: nenhuma', () => {
    expect(selectedOption(opts, null)).toBeNull();
    expect(selectedOption(opts, 'legacy')).toBeNull();
  });
});
