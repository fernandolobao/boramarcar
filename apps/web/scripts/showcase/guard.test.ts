import { describe, expect, it } from 'vitest';
import { assertDisposableDatabase } from './guard';

describe('guarda do banco das capturas', () => {
  it('aceita só um banco local chamado showcase*', () => {
    expect(() => assertDisposableDatabase('postgres://u@localhost:5433/showcase')).not.toThrow();
    expect(() => assertDisposableDatabase('postgres://u@127.0.0.1:5433/showcase_2')).not.toThrow();
  });

  it('recusa banco remoto ou com outro nome, antes de qualquer escrita', () => {
    expect(() =>
      assertDisposableDatabase('postgres://u:p@ep-x.sa-east-1.aws.neon.tech/neondb'),
    ).toThrow(/descartável/);
    expect(() => assertDisposableDatabase('postgres://u@localhost:5433/boramarcar')).toThrow();
    expect(() => assertDisposableDatabase('não é uma url')).toThrow();
  });
});
