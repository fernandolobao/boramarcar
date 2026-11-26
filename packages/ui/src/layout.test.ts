import { describe, expect, it } from 'vitest';
import { gridColumns, layoutFor } from './layout';

describe('layout por largura (celular, tablet, tablet grande)', () => {
  it('celular até 599 pt; tablet de 600 a 1023; grande a partir de 1024', () => {
    expect(layoutFor(390).size).toBe('compact');
    expect(layoutFor(599).size).toBe('compact');
    // iPad 9 em pé (810 pt) e mini (744 pt).
    expect(layoutFor(744).size).toBe('medium');
    expect(layoutFor(810).size).toBe('medium');
    // iPad deitado (1080 pt) e iPad Pro.
    expect(layoutFor(1080).size).toBe('expanded');
    expect(layoutFor(1366).size).toBe('expanded');
  });

  it('o conteúdo tem largura máxima e fica centralizado (margem dos lados)', () => {
    expect(layoutFor(390)).toMatchObject({ contentWidth: 390, wide: false });
    expect(layoutFor(810)).toMatchObject({ contentWidth: 810, wide: true });
    expect(layoutFor(1366).contentWidth).toBe(1200);
  });

  it('colunas de uma grade: mínimo por item, máximo pela faixa', () => {
    // Cartões de deck (mín. 300 pt): 1 no celular, 2 no iPad em pé, 3 deitado.
    expect(gridColumns(358, { min: 300 })).toBe(1);
    expect(gridColumns(778, { min: 300 })).toBe(2);
    expect(gridColumns(1048, { min: 300 })).toBe(3);
    // Cartas (mín. 110 pt, até 8): 3 no celular, 6 no iPad em pé, 8 deitado.
    expect(gridColumns(358, { min: 110, max: 8 })).toBe(3);
    expect(gridColumns(778, { min: 110, max: 8 })).toBe(6);
    expect(gridColumns(1168, { min: 110, max: 8 })).toBe(8);
    // Nunca menos que 1.
    expect(gridColumns(80, { min: 110 })).toBe(1);
  });
});
