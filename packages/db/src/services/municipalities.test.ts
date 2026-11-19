import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { getMunicipality, getMunicipalityByCode, searchMunicipalities } from './municipalities';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('municípios do IBGE', () => {
  it('estão todos carregados, com coordenadas', async () => {
    const curitiba = await getMunicipalityByCode(db, '4106902');
    expect(curitiba).toMatchObject({ name: 'Curitiba', uf: 'PR', slug: 'curitiba' });
    expect(curitiba!.lat).toBeCloseTo(-25.42, 1);
  });

  it('busca sem acento e sem caixa; homônimos de UFs diferentes aparecem separados', async () => {
    // Nome exato primeiro (há mais de 50 "São José…").
    const [exact] = await searchMunicipalities(db, { query: 'sao jose' });
    expect(exact).toMatchObject({ name: 'São José', uf: 'SC' });
    const found = await searchMunicipalities(db, { query: 'SÃO JOSÉ DOS P' });
    expect(found.map((m) => `${m.name}/${m.uf}`)).toContain('São José dos Pinhais/PR');
    const bomJesus = await searchMunicipalities(db, { query: 'Bom Jesus', limit: 50 });
    expect(
      new Set(bomJesus.filter((m) => m.name === 'Bom Jesus').map((m) => m.uf)).size,
    ).toBeGreaterThan(1);
  });

  it('capitais primeiro', async () => {
    const [first] = await searchMunicipalities(db, { query: 'CURIT' });
    expect(first).toMatchObject({ name: 'Curitiba', uf: 'PR' });
  });

  it('acha pela UF e pelo endereço da cidade; UF errada não acha', async () => {
    expect(await getMunicipality(db, { uf: 'pr', slug: 'curitiba' })).toMatchObject({
      code: '4106902',
    });
    expect(await getMunicipality(db, { uf: 'xx', slug: 'curitiba' })).toBeNull();
    expect(await searchMunicipalities(db, { query: ' ' })).toEqual([]);
  });
});
