import { describe, expect, it } from 'vitest';
import { matchesPrint } from './print-picker';

const pca = { setCode: 'pca', setName: 'Planechase Anthology', collectorNumber: '137' };
const ltr = {
  setCode: 'ltr',
  setName: 'The Lord of the Rings: Tales of Middle-earth',
  collectorNumber: '262',
};
const other = { setCode: 'm21', setName: 'Core Set 2021', collectorNumber: '137' };

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
});
