import { describe, expect, it } from 'vitest';
import { headToHeadBetween, rivalriesFor } from './rivalries';

const row = (userId: string, opponentId: string, games: number, wins: number, losses: number) => ({
  userId,
  opponentId,
  games,
  wins,
  losses,
});

describe('rivalidades', () => {
  const h2h = [
    row('me', 'bia', 8, 2, 5),
    row('me', 'caio', 6, 4, 1),
    row('me', 'duda', 2, 0, 2), // menos de 3 partidas juntos: não conta
    row('me', 'eva', 5, 1, 3),
    row('bia', 'me', 8, 5, 2),
  ];

  it('maior rival = quem mais venceu você; freguês = quem você mais venceu (mínimo 3 partidas)', () => {
    expect(rivalriesFor(h2h, 'me')).toEqual({
      rival: { opponentId: 'bia', games: 8, wins: 2, losses: 5 },
      prey: { opponentId: 'caio', games: 6, wins: 4, losses: 1 },
    });
  });

  it('sem partidas suficientes, sem rótulo', () => {
    expect(rivalriesFor([row('me', 'duda', 2, 0, 2)], 'me')).toEqual({ rival: null, prey: null });
  });

  it('a mesma pessoa não é rival e freguês ao mesmo tempo', () => {
    const only = [row('me', 'bia', 6, 3, 3)];
    const { rival, prey } = rivalriesFor(only, 'me');
    expect([rival?.opponentId, prey?.opponentId].filter(Boolean)).toEqual(['bia']);
  });

  it('confronto entre duas pessoas (perfil de outra pessoa)', () => {
    expect(headToHeadBetween(h2h, 'me', 'bia')).toEqual({ games: 8, wins: 2, losses: 5 });
    expect(headToHeadBetween(h2h, 'me', 'zé')).toBeNull();
  });
});
