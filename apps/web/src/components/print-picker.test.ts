import { describe, expect, it } from 'vitest';
import { matchesPrint } from './print-picker';

const pca = { setCode: 'pca', setName: 'Planechase Anthology', collectorNumber: '137' };
const ltr = {
  setCode: 'ltr',
  setName: 'The Lord of the Rings: Tales of Middle-earth',
  collectorNumber: '262',
};
const other = { setCode: 'm21', setName: 'Core Set 2021', collectorNumber: '137' };
const alpha = {
  setCode: 'lea',
  setName: 'Limited Edition Alpha',
  collectorNumber: '270',
  artist: 'Mark Tedin',
};

describe('filtro de impressões', () => {
  it('código + número, com ou sem #', () => {
    expect(matchesPrint(pca, 'pca 137')).toBe(true);
    expect(matchesPrint(pca, 'PCA #137')).toBe(true);
    expect(matchesPrint(other, 'pca 137')).toBe(false);
    expect(matchesPrint(pca, 'pca 5')).toBe(false);
  });

  it('nome da edição (parte), número sozinho, código sozinho e vazio', () => {
    expect(matchesPrint(ltr, 'lord of the rings 262')).toBe(true);
    expect(matchesPrint(ltr, 'lord of the rings 263')).toBe(false);
    expect(matchesPrint(pca, 'planechase')).toBe(true);
    expect(matchesPrint(other, '137')).toBe(true);
    expect(matchesPrint(ltr, 'ltr')).toBe(true);
    expect(matchesPrint(ltr, '  ')).toBe(true);
  });

  it('nome do ilustrador (cartas antigas não têm número na carta)', () => {
    expect(matchesPrint(alpha, 'tedin')).toBe(true);
    expect(matchesPrint(alpha, 'Mark Tedin')).toBe(true);
    expect(matchesPrint(alpha, 'tedin 270')).toBe(true);
    expect(matchesPrint(alpha, 'tedin 5')).toBe(false);
    expect(matchesPrint(alpha, 'alpha tedin')).toBe(false);
    expect(matchesPrint({ ...alpha, artist: null }, 'tedin')).toBe(false);
    expect(matchesPrint(pca, 'tedin')).toBe(false);
  });
});
