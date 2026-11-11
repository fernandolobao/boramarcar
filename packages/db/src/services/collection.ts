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
  /** Decks da pessoa com esta carta (qualquer impressão), pelo nome. */
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
      .groupBy(sql`lower(${deckCards.cardName})`, decks.id, decks.name)
      .orderBy(asc(decks.name)),
  ]);
  const byName = new Map<string, CollectionDeckUse[]>();
  for (const { name, ...use } of uses) {
    const list = byName.get(name) ?? [];
    list.push(use);
    byName.set(name, list);
  }
  return rows.map(({ entry, card }) => ({
    id: entry.id,
    name: entry.cardName,
    scryfallId: entry.scryfallId,
    quantity: entry.quantity,
    foil: entry.isFoil,
    card: card ? toCardData(card) : null,
    addedAt: entry.createdAt,
    decks: byName.get(entry.cardName.toLowerCase()) ?? [],
  }));
}

function checkQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_COLLECTION_COPIES) {
    throw new DomainError('invalid_input', `Quantidade entre 0 e ${MAX_COLLECTION_COPIES}`);
  }
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

/**
 * Muda quantidade, acabamento ou impressão de uma linha. Se a mudança cair numa linha que já
 * existe (ex.: marcar foil e já havia foil dessa impressão), as cópias são somadas nela.
 * Quantidade 0 remove a linha.
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
    await tx.delete(collectionCards).where(eq(collectionCards.id, row.id));
    await addTo(tx, {
      userId: input.userId,
      name: row.cardName,
      scryfallId: target.scryfallId,
      foil: target.foil,
      quantity,
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
