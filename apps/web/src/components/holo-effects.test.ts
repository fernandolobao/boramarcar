import { describe, expect, it } from 'vitest';
import { orientationTilt } from './holo-effects';

describe('orientationTilt', () => {
  it('retrato: gamma inclina para os lados, beta (menos a posição inicial) para frente e trás', () => {
    expect(orientationTilt({ beta: 45, gamma: 0 }, 45, 0)).toEqual({ x: 0, y: 0, a: 0 });
    const t = orientationTilt({ beta: 57.5, gamma: -12.5 }, 45, 0);
    expect(t.x).toBeCloseTo(-0.5);
    expect(t.y).toBeCloseTo(0.5);
    expect(t.a).toBeCloseTo(Math.hypot(0.5, 0.5));
  });

  it('limita a −1…1', () => {
    expect(orientationTilt({ beta: 200, gamma: 90 }, 0, 0)).toMatchObject({ x: 1, y: 1, a: 1 });
  });

  it('paisagem troca os eixos', () => {
    expect(orientationTilt({ beta: 25, gamma: 0 }, 0, 90)).toMatchObject({ x: 1, y: -0 });
    expect(orientationTilt({ beta: 25, gamma: 0 }, 0, 270)).toMatchObject({ x: -1 });
    expect(orientationTilt({ beta: null, gamma: null }, 0, -90).a).toBe(0);
  });
});
