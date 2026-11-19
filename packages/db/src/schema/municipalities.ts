import { boolean, doublePrecision, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Municípios do IBGE (10.3): código, nome, UF e o centro de cada um (latitude e longitude).
 * Carregados por migration a partir de `packages/db/data/municipios.csv` (dados de
 * `kelvins/municipios-brasileiros`, MIT; licença em `data/LICENSE-municipios.txt`).
 */
export const municipalities = pgTable(
  'municipalities',
  {
    /** Código IBGE (7 dígitos). */
    code: text('code').primaryKey(),
    name: text('name').notNull(),
    /** Sigla da UF (ex.: `PR`). */
    uf: text('uf').notNull(),
    /** Nome sem acento, minúsculo, com hífen (`sao-jose-dos-pinhais`). */
    slug: text('slug').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    capital: boolean('capital').notNull().default(false),
  },
  (t) => [uniqueIndex('municipalities_uf_slug_idx').on(t.uf, t.slug)],
);
