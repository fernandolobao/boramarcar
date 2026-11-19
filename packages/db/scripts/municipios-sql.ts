/**
 * Gera o SQL dos municípios (10.3) a partir de `data/municipios.csv` para a migration de dados.
 * Uso: `pnpm --filter @boramarcar/db exec tsx scripts/municipios-sql.ts drizzle/<arquivo>.sql`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { municipalitySlug } from '@boramarcar/core/discovery';

const [, , out] = process.argv;
if (!out) throw new Error('Informe o arquivo da migration');

/** Lê uma linha de CSV com campos opcionalmente entre aspas. */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') quoted = false;
      else current += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      fields.push(current);
      current = '';
    } else current += c;
  }
  fields.push(current);
  return fields;
}

const sql = (value: string) => `'${value.replace(/'/g, "''")}'`;
const lines = readFileSync(new URL('../data/municipios.csv', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .slice(1);
const rows = lines.map((line) => {
  const [code, name, uf, lat, lng, capital] = parseLine(line);
  return `(${sql(code!)}, ${sql(name!)}, ${sql(uf!)}, ${sql(municipalitySlug(name!))}, ${Number(lat)}, ${Number(lng)}, ${capital === '1'})`;
});
const chunks: string[] = [];
for (let i = 0; i < rows.length; i += 500) {
  chunks.push(
    `INSERT INTO "municipalities" ("code", "name", "uf", "slug", "lat", "lng", "capital") VALUES\n${rows
      .slice(i, i + 500)
      .join(',\n')};`,
  );
}
writeFileSync(
  out,
  `-- Municípios do IBGE (10.3), gerado por scripts/municipios-sql.ts a partir de data/municipios.csv.\n${chunks.join('\n--> statement-breakpoint\n')}\n`,
);
process.stdout.write(`${rows.length} municípios\n`);
