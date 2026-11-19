import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { stores } from '../schema';
import { createTestDb, createTestUser } from '../testing';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

/** O trecho da migration 0035 que liga as lojas antigas ao município (rodado de novo aqui). */
const linkStatement = readFileSync(
  new URL('../../drizzle/0035_unique_lionheart.sql', import.meta.url),
  'utf8',
)
  .split('--> statement-breakpoint')
  .find((part) => part.includes('lojas antigas'))!;

describe('migração das lojas antigas para o município (10.3)', () => {
  it('liga pela cidade sem acento e sem caixa; homônimo em mais de uma UF fica a confirmar', async () => {
    const admin = await createTestUser(db);
    const insert = (slug: string, city: string) =>
      db
        .insert(stores)
        .values({ slug, name: slug, city, contactEmail: `${slug}@x.test`, createdBy: admin.id })
        .returning({ id: stores.id });
    await insert('antiga-curitiba', ' curitiba ');
    await insert('antiga-sao-paulo', 'SAO PAULO');
    await insert('antiga-bom-jesus', 'Bom Jesus');
    await insert('antiga-inventada', 'Cidade Que Não Existe');
    await db.execute(sql.raw(linkStatement));
    const rows = await db.select({ slug: stores.slug, code: stores.municipalityCode }).from(stores);
    const codeOf = Object.fromEntries(rows.map((r) => [r.slug, r.code]));
    expect(codeOf['antiga-curitiba']).toBe('4106902');
    expect(codeOf['antiga-sao-paulo']).toBe('3550308');
    expect(codeOf['antiga-bom-jesus']).toBeNull();
    expect(codeOf['antiga-inventada']).toBeNull();
  });
});
