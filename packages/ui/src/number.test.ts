import { describe, expect, it } from 'vitest';
import { clampNumber, parseNumberInput, stepNumber, stepperLabel } from './number';

describe('números do NumberField', () => {
  it('limita ao intervalo', () => {
    expect(clampNumber(300, 0, 250)).toBe(250);
    expect(clampNumber(-1, 0)).toBe(0);
    expect(clampNumber(7)).toBe(7);
  });

  it('dá passos respeitando limites; vazio parte do mínimo', () => {
    expect(stepNumber(null, 1, { min: 1, max: 99 })).toBe(1);
    expect(stepNumber(3, 1, { max: 3 })).toBe(3);
    expect(stepNumber(30, -1, { step: 30, min: 30 })).toBe(30);
    expect(stepNumber(60, 1, { step: 30 })).toBe(90);
    expect(stepNumber(null, 1, {})).toBe(1);
  });

  it('lê o texto digitado: vazio e não inteiro viram null', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('  12 ')).toBe(12);
    expect(parseNumberInput('1,5')).toBeNull();
    expect(parseNumberInput('-3')).toBe(-3);
    expect(parseNumberInput('abc')).toBeNull();
  });

  it('monta o nome dos botões com rótulo e valor atual', () => {
    const labels = {
      decrease: '{label}: diminuir (agora {value})',
      increase: '{label}: aumentar (agora {value})',
    };
    expect(stepperLabel('Cópias', 'up', 3, labels)).toBe('Cópias: aumentar (agora 3)');
    expect(stepperLabel('Turno', 'down', null, labels)).toBe('Turno: diminuir (agora —)');
  });
});
