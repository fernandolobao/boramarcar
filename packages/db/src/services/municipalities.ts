import { municipalitySlug } from '@boramarcar/core/discovery';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { municipalities } from '../schema';

const fields = {
  code: municipalities.code,
  name: municipalities.name,
  uf: municipalities.uf,
  slug: municipalities.slug,
  lat: municipalities.lat,
  lng: municipalities.lng,
};
export type Municipality = {
  code: string;
  name: string;
  uf: string;
  slug: string;
  lat: number;
  lng: number;
};

/**
 * Cidades pelo começo do nome, sem acento e sem caixa ("sao jose" acha "São José"). Nome exato
 * primeiro, depois capitais, depois em ordem alfabética. Busca vazia não traz nada.
 */
export async function searchMunicipalities(
  db: Database,
  input: { query: string; limit?: number },
): Promise<Municipality[]> {
  const q = municipalitySlug(input.query);
  if (!q) return [];
  return db
    .select(fields)
    .from(municipalities)
    .where(like(municipalities.slug, `${q}%`))
    .orderBy(
      desc(sql`${municipalities.slug} = ${q}`),
      desc(municipalities.capital),
      asc(municipalities.slug),
      asc(municipalities.uf),
    )
    .limit(Math.min(Math.max(input.limit ?? 10, 1), 50));
}

/** Cidade pela UF e pelo endereço (`pr` + `curitiba`); `null` se não existe. */
export async function getMunicipality(
  db: Database,
  input: { uf: string; slug: string },
): Promise<Municipality | null> {
  const [row] = await db
    .select(fields)
    .from(municipalities)
    .where(and(eq(municipalities.uf, input.uf.toUpperCase()), eq(municipalities.slug, input.slug)))
    .limit(1);
  return row ?? null;
}

/** Cidade pelo código do IBGE; `null` se não existe. */
export async function getMunicipalityByCode(
  db: Database,
  code: string,
): Promise<Municipality | null> {
  const [row] = await db
    .select(fields)
    .from(municipalities)
    .where(eq(municipalities.code, code))
    .limit(1);
  return row ?? null;
}
