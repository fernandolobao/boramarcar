import { DomainError, type CardData } from '@boramarcar/core';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { cards, collectionCards, deckCards, decks } from '../schema';
import { toCardData, upsertCards } from './decks';

/** Máximo de cópias de uma carta (mesma impressão e acabamento) numa linha da coleção. */
export const MAX_COLLECTION_COPIES = 999;

/**
 * Garante que a coleção tenha pelo menos as cartas dos decks da pessoa: para cada carta,
 * impressão e acabamento, a soma das cópias não proxy em todos os decks (fora o maybeboard).
 * Só acrescenta: tirar uma carta de um deck não tira da coleção, porque ela continua sendo sua.
 */
export async function syncCollectionFromDecks(db: Database, userId: string) {
  await db.execute(sql`
    insert into ${collectionCards} (id, user_id, card_name, scryfall_id, quantity, is_foil)
    select gen_random_uuid()::text, ${userId}, dc.card_name, dc.scryfall_id,
           sum(dc.quantity)::integer, dc.is_foil
    from ${deckCards} dc
    join ${decks} d on d.id = dc.deck_id
    where d.owner_id = ${userId} and dc.is_proxy = false and dc.board <> 'maybeboard'
    group by dc.card_name, dc.scryfall_id, dc.is_foil
    on conflict (user_id, card_name, coalesce(scryfall_id, ''), is_foil)
    do update set
      quantity = greatest(${collectionCards.quantity}, excluded.quantity),
      updated_at = case when excluded.quantity > ${collectionCards.quantity}
                        then now() else ${collectionCards.updatedAt} end
  `);
}

export interface CollectionDeckUse {
  deckId: string;
  deckName: string;
  quantity: number;
  /** Cópias proxy desta carta no deck (não vêm da coleção). */
  proxies: number;
}

export interface CollectionEntry {
  id: string;
  name: string;
  scryfallId: string | null;
  quantity: number;
  foil: boolean;
  card: CardData | null;
  addedAt: Date;
  /** Decks da pessoa com esta mesma versão (impressão e foil). */
  decks: CollectionDeckUse[];
}

/** A coleção inteira (as telas filtram no navegador, que é bem mais rápido para muitas cartas). */
export async function listCollection(db: Database, userId: string): Promise<CollectionEntry[]> {
  const [rows, uses] = await Promise.all([
    db
      .select({ entry: collectionCards, card: cards })
      .from(collectionCards)
      .leftJoin(cards, eq(cards.scryfallId, collectionCards.scryfallId))
      .where(eq(collectionCards.userId, userId))
      .orderBy(asc(collectionCards.cardName)),
    db
      .select({
        name: sql<string>`lower(${deckCards.cardName})`,
        scryfallId: deckCards.scryfallId,
        isFoil: deckCards.isFoil,
        deckId: decks.id,
        deckName: decks.name,
        quantity: sql<number>`sum(${deckCards.quantity})`.mapWith(Number),
        proxies:
          sql<number>`sum(case when ${deckCards.isProxy} then ${deckCards.quantity} else 0 end)`.mapWith(
            Number,
          ),
      })
      .from(deckCards)
      .innerJoin(decks, eq(decks.id, deckCards.deckId))
      .where(and(eq(decks.ownerId, userId), ne(deckCards.board, 'maybeboard')))
      .groupBy(
        sql`lower(${deckCards.cardName})`,
        deckCards.scryfallId,
        deckCards.isFoil,
        decks.id,
        decks.name,
      )
      .orderBy(asc(decks.name)),
  ]);
  // A mesma versão: carta, impressão e acabamento (foil é outra versão, com outro valor).
  const key = (name: string, scryfallId: string | null, foil: boolean) =>
    `${name.toLowerCase()}|${scryfallId ?? ''}|${foil}`;
  const byVersion = new Map<string, CollectionDeckUse[]>();
  for (const { name, scryfallId, isFoil, ...use } of uses) {
    const k = key(name, scryfallId, isFoil);
    byVersion.set(k, [...(byVersion.get(k) ?? []), use]);
  }
  return rows.map(({ entry, card }) => ({
    id: entry.id,
    name: entry.cardName,
    scryfallId: entry.scryfallId,
    quantity: entry.quantity,
    foil: entry.isFoil,
    card: card ? toCardData(card) : null,
    addedAt: entry.createdAt,
    decks: byVersion.get(key(entry.cardName, entry.scryfallId, entry.isFoil)) ?? [],
  }));
}

function checkQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_COLLECTION_COPIES) {
    throw new DomainError('invalid_input', `Quantidade entre 0 e ${MAX_COLLECTION_COPIES}`);
  }
}

/**
 * Quando a pessoa troca a edição (ou o foil) de cópias reais num deck, aquelas cópias saem da
 * versão antiga na coleção; a nova versão entra pela sincronia com os decks. Assim corrigir a
 * edição no deck corrige a coleção, sem deixar a versão antiga para trás.
 */
export async function takeFromCollection(
  db: Pick<Database, 'execute'>,
  input: {
    userId: string;
    name: string;
    scryfallId: string | null;
    foil: boolean;
    quantity: number;
  },
) {
  if (input.quantity <= 0) return;
  const same = sql`user_id = ${input.userId} and lower(card_name) = ${input.name.toLowerCase()}
    and coalesce(scryfall_id, '') = ${input.scryfallId ?? ''} and is_foil = ${input.foil}`;
  await db.execute(sql`
    update ${collectionCards} set quantity = quantity - ${input.quantity}, updated_at = now()
    where ${same} and quantity > ${input.quantity}
  `);
  await db.execute(
    sql`delete from ${collectionCards} where ${same} and quantity <= ${input.quantity}`,
  );
}

/** Soma cópias à linha (carta, impressão, acabamento), criando a linha se preciso. */
async function addTo(
  db: Pick<Database, 'execute'>,
  input: {
    userId: string;
    name: string;
    scryfallId: string | null;
    foil: boolean;
    quantity: number;
  },
) {
  await db.execute(sql`
    insert into ${collectionCards} (id, user_id, card_name, scryfall_id, quantity, is_foil)
    values (gen_random_uuid()::text, ${input.userId}, ${input.name}, ${input.scryfallId},
            ${input.quantity}, ${input.foil})
    on conflict (user_id, card_name, coalesce(scryfall_id, ''), is_foil)
    do update set quantity = least(${collectionCards.quantity} + excluded.quantity, ${MAX_COLLECTION_COPIES}),
                  updated_at = now()
  `);
}

/** Acrescenta cópias de uma carta à coleção (a carta já vem resolvida no Scryfall). */
export async function addCollectionCard(
  db: Database,
  input: { userId: string; card: CardData; quantity: number; foil: boolean },
) {
  checkQuantity(input.quantity);
  if (input.quantity === 0) throw new DomainError('invalid_input', 'Informe ao menos 1 cópia');
  await upsertCards(db, [input.card]);
  await addTo(db, {
    userId: input.userId,
    name: input.card.name,
    scryfallId: input.card.scryfallId,
    foil: input.foil,
    quantity: input.quantity,
  });
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Leva para outra versão (impressão e/ou acabamento) as cópias dos decks da pessoa que não cabem
 * mais na versão antiga da coleção. Sem isso, a próxima sincronia com os decks (que só
 * acrescenta) traria a versão antiga de volta, como se fossem cartas novas.
 */
async function moveDeckCopies(
  tx: Tx,
  input: {
    userId: string;
    name: string;
    from: { scryfallId: string | null; foil: boolean };
    to: { scryfallId: string | null; foil: boolean };
    /** Cópias da versão antiga que continuam na coleção. */
    remaining: number;
    /** No máximo quantas cópias de deck podem mudar (as que mudaram na coleção). */
    max: number;
  },
) {
  const same = (v: { scryfallId: string | null; foil: boolean }) =>
    and(
      sql`${deckCards.deckId} in (select ${decks.id} from ${decks} where ${decks.ownerId} = ${input.userId})`,
      sql`lower(${deckCards.cardName}) = ${input.name.toLowerCase()}`,
      v.scryfallId ? eq(deckCards.scryfallId, v.scryfallId) : sql`${deckCards.scryfallId} is null`,
      eq(deckCards.isFoil, v.foil),
      eq(deckCards.isProxy, false),
      ne(deckCards.board, 'maybeboard'),
    );
  const rows = await tx.select().from(deckCards).where(same(input.from)).orderBy(asc(deckCards.id));
  const inDecks = rows.reduce((n, r) => n + r.quantity, 0);
  let left = Math.min(input.max, Math.max(0, inDecks - input.remaining));
  for (const row of rows) {
    if (left <= 0) break;
    const take = Math.min(left, row.quantity);
    left -= take;
    if (take === row.quantity) await tx.delete(deckCards).where(eq(deckCards.id, row.id));
    else
      await tx
        .update(deckCards)
        .set({ quantity: row.quantity - take })
        .where(eq(deckCards.id, row.id));
    const [twin] = await tx
      .select()
      .from(deckCards)
      .where(and(same(input.to), eq(deckCards.deckId, row.deckId), eq(deckCards.board, row.board)))
      .limit(1);
    if (twin) {
      await tx
        .update(deckCards)
        .set({ quantity: twin.quantity + take })
        .where(eq(deckCards.id, twin.id));
    } else {
      await tx.insert(deckCards).values({
        deckId: row.deckId,
        cardName: row.cardName,
        scryfallId: input.to.scryfallId,
        board: row.board,
        quantity: take,
        isProxy: false,
        isFoil: input.to.foil,
      });
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, row.deckId));
  }
}

/**
 * Muda quantidade, acabamento ou impressão de uma linha. Se a mudança cair numa linha que já
 * existe (ex.: marcar foil e já havia foil dessa impressão), as cópias são somadas nela.
 * Quantidade 0 remove a linha. Com `copies`, só essa parte das cópias muda de versão (o resto
 * fica na linha). As cópias que mudam de versão mudam também nos decks da pessoa, para a
 * sincronia não trazer a versão antiga de volta.
 */
export async function updateCollectionCard(
  db: Database,
  input: {
    userId: string;
    id: string;
    quantity?: number;
    foil?: boolean;
    /** Nova impressão (a carta já resolvida no Scryfall). */
    card?: CardData;
    /** Quantas cópias mudam de impressão/acabamento (padrão: todas). */
    copies?: number;
  },
) {
  const [row] = await db
    .select()
    .from(collectionCards)
    .where(and(eq(collectionCards.id, input.id), eq(collectionCards.userId, input.userId)))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Carta não encontrada na coleção');
  const quantity = input.quantity ?? row.quantity;
  checkQuantity(quantity);
  if (input.card) {
    if (input.card.name.toLowerCase() !== row.cardName.toLowerCase()) {
      throw new DomainError('invalid_input', 'A impressão precisa ser da mesma carta');
    }
    await upsertCards(db, [input.card]);
  }
  const target = {
    scryfallId: input.card ? input.card.scryfallId : row.scryfallId,
    foil: input.foil ?? row.isFoil,
  };
  const sameLine = target.scryfallId === row.scryfallId && target.foil === row.isFoil;

  await db.transaction(async (tx) => {
    if (quantity === 0) {
      await tx.delete(collectionCards).where(eq(collectionCards.id, row.id));
      return;
    }
    if (sameLine) {
      await tx
        .update(collectionCards)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(collectionCards.id, row.id));
      return;
    }
    const moving = input.copies ?? quantity;
    if (!Number.isInteger(moving) || moving < 1 || moving > quantity) {
      throw new DomainError('invalid_input', `A coleção tem só ${quantity} cópias desta versão`);
    }
    const remaining = quantity - moving;
    if (remaining === 0) await tx.delete(collectionCards).where(eq(collectionCards.id, row.id));
    else
      await tx
        .update(collectionCards)
        .set({ quantity: remaining, updatedAt: new Date() })
        .where(eq(collectionCards.id, row.id));
    await addTo(tx, {
      userId: input.userId,
      name: row.cardName,
      scryfallId: target.scryfallId,
      foil: target.foil,
      quantity: moving,
    });
    await moveDeckCopies(tx, {
      userId: input.userId,
      name: row.cardName,
      from: { scryfallId: row.scryfallId, foil: row.isFoil },
      to: target,
      remaining,
      max: moving,
    });
  });
  return { removed: quantity === 0 };
}

export async function removeCollectionCard(db: Database, input: { userId: string; id: string }) {
  const removed = await db
    .delete(collectionCards)
    .where(and(eq(collectionCards.id, input.id), eq(collectionCards.userId, input.userId)))
    .returning({ id: collectionCards.id });
  if (!removed.length) throw new DomainError('not_found', 'Carta não encontrada na coleção');
}
