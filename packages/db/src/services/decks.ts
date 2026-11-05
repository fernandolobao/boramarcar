import {
  analyzeDeck,
  attachCardData,
  DomainError,
  type CardData,
  type ImportedDeck,
} from '@boramarcar/core';
import { and, asc, count, desc, eq, inArray, or, sql, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../client';
import { cards, deckCards, decks, groupMembers } from '../schema';

/** Insere ou atualiza o cache de cartas do Scryfall. */
export async function upsertCards(db: Database, data: readonly CardData[]) {
  if (!data.length) return;
  const unique = [...new Map(data.map((c) => [c.scryfallId, c])).values()];
  await db
    .insert(cards)
    .values(
      unique.map((c) => ({
        scryfallId: c.scryfallId,
        oracleId: c.oracleId ?? null,
        name: c.name,
        manaCost: c.manaCost ?? null,
        cmc: c.cmc,
        typeLine: c.typeLine,
        oracleText: c.oracleText ?? null,
        colors: c.colors,
        colorIdentity: c.colorIdentity,
        imageUri: c.imageUri ?? null,
        priceUsd: c.priceUsd ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: cards.scryfallId,
      set: {
        oracleId: sql`excluded.oracle_id`,
        name: sql`excluded.name`,
        manaCost: sql`excluded.mana_cost`,
        cmc: sql`excluded.cmc`,
        typeLine: sql`excluded.type_line`,
        oracleText: sql`excluded.oracle_text`,
        colors: sql`excluded.colors`,
        colorIdentity: sql`excluded.color_identity`,
        imageUri: sql`excluded.image_uri`,
        priceUsd: sql`excluded.price_usd`,
        updatedAt: new Date(),
      },
    });
}

/** Busca no cache local as cartas de uma lista (por id Scryfall ou nome). */
export async function findCachedCards(
  db: Database,
  entries: readonly { name: string; scryfallId?: string }[],
): Promise<CardData[]> {
  const ids = [...new Set(entries.flatMap((e) => (e.scryfallId ? [e.scryfallId] : [])))];
  const names = [...new Set(entries.map((e) => e.name.toLowerCase()))];
  if (!ids.length && !names.length) return [];
  const rows = await db
    .select()
    .from(cards)
    .where(
      or(
        ids.length ? inArray(cards.scryfallId, ids) : undefined,
        names.length ? inArray(sql`lower(${cards.name})`, names) : undefined,
      ),
    );
  return rows.map(toCardData);
}

function toCardData(card: typeof cards.$inferSelect): CardData {
  return {
    scryfallId: card.scryfallId,
    oracleId: card.oracleId,
    name: card.name,
    manaCost: card.manaCost,
    cmc: card.cmc,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    colors: card.colors,
    colorIdentity: card.colorIdentity,
    imageUri: card.imageUri,
    priceUsd: card.priceUsd,
  };
}

/** Salva um deck importado junto com o cache das cartas encontradas no Scryfall. */
export async function saveImportedDeck(
  db: Database,
  input: { ownerId: string; deck: ImportedDeck; cards: readonly CardData[] },
) {
  const name = input.deck.name.trim();
  if (!name) throw new DomainError('invalid_input', 'Informe o nome do deck');
  if (!input.deck.entries.length) throw new DomainError('invalid_input', 'O deck está vazio');

  await upsertCards(db, input.cards);
  const known = [...input.cards, ...(await findCachedCards(db, input.deck.entries))];
  const linked = attachCardData(input.deck.entries, known);
  return db.transaction(async (tx) => {
    const [deck] = await tx
      .insert(decks)
      .values({
        ownerId: input.ownerId,
        name,
        source: input.deck.source,
        sourceId: input.deck.sourceId ?? null,
        sourceUrl: input.deck.sourceUrl ?? null,
      })
      .returning();
    await tx.insert(deckCards).values(
      linked.map((entry) => ({
        deckId: deck!.id,
        cardName: entry.card?.name ?? entry.name,
        scryfallId: entry.card?.scryfallId ?? null,
        quantity: entry.quantity,
        board: entry.board,
        isProxy: entry.isProxy ?? false,
        isFoil: entry.isFoil ?? false,
      })),
    );
    return deck!;
  });
}

export async function listDecks(db: Database, ownerId: string) {
  return db
    .select({
      id: decks.id,
      name: decks.name,
      source: decks.source,
      sourceUrl: decks.sourceUrl,
      updatedAt: decks.updatedAt,
      cardCount: sum(deckCards.quantity).mapWith(Number),
      proxyCount:
        sql<number>`coalesce(sum(case when ${deckCards.isProxy} then ${deckCards.quantity} else 0 end), 0)`.mapWith(
          Number,
        ),
      lines: count(deckCards.id),
    })
    .from(decks)
    .leftJoin(deckCards, eq(deckCards.deckId, decks.id))
    .where(eq(decks.ownerId, ownerId))
    .groupBy(decks.id)
    .orderBy(desc(decks.updatedAt));
}

/** Decks (resumo) de vários jogadores — usado ao registrar partidas. */
export async function listDecksForUsers(db: Database, userIds: readonly string[]) {
  if (!userIds.length) return [];
  return db
    .select({ id: decks.id, name: decks.name, ownerId: decks.ownerId })
    .from(decks)
    .where(inArray(decks.ownerId, [...userIds]))
    .orderBy(asc(decks.name));
}

/** Dono do deck ou alguém que divide um grupo com o dono pode visualizar. */
async function canView(db: Database, ownerId: string, viewerId: string) {
  if (ownerId === viewerId) return true;
  const a = alias(groupMembers, 'owner_membership');
  const b = alias(groupMembers, 'viewer_membership');
  const [shared] = await db
    .select({ groupId: a.groupId })
    .from(a)
    .innerJoin(b, eq(a.groupId, b.groupId))
    .where(and(eq(a.userId, ownerId), eq(b.userId, viewerId)))
    .limit(1);
  return Boolean(shared);
}

export async function getDeck(db: Database, input: { deckId: string; viewerId: string }) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, input.deckId)).limit(1);
  if (!deck) throw new DomainError('not_found', 'Deck não encontrado');
  if (!(await canView(db, deck.ownerId, input.viewerId))) {
    throw new DomainError('forbidden', 'Você não pode ver este deck');
  }
  const rows = await db
    .select({ entry: deckCards, card: cards })
    .from(deckCards)
    .leftJoin(cards, eq(cards.scryfallId, deckCards.scryfallId))
    .where(eq(deckCards.deckId, deck.id))
    .orderBy(asc(deckCards.board), asc(deckCards.cardName));

  const entries = rows.map(({ entry, card }) => ({
    id: entry.id,
    name: entry.cardName,
    quantity: entry.quantity,
    board: entry.board,
    isProxy: entry.isProxy,
    isFoil: entry.isFoil,
    card: card ? toCardData(card) : null,
  }));

  return {
    ...deck,
    isOwner: deck.ownerId === input.viewerId,
    entries,
    analysis: analyzeDeck(entries),
  };
}

/**
 * Marca/desmarca uma linha do deck como proxy. Se já existir a mesma carta com o
 * status de destino, as quantidades são unidas.
 */
export async function setDeckCardProxy(
  db: Database,
  input: { deckId: string; deckCardId: string; userId: string; isProxy: boolean },
) {
  const [row] = await db
    .select({ entry: deckCards, ownerId: decks.ownerId })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .where(and(eq(deckCards.id, input.deckCardId), eq(deckCards.deckId, input.deckId)))
    .limit(1);
  if (!row) throw new DomainError('not_found', 'Carta não encontrada no deck');
  if (row.ownerId !== input.userId)
    throw new DomainError('forbidden', 'Apenas o dono edita o deck');
  if (row.entry.isProxy === input.isProxy) return row.entry;

  return db.transaction(async (tx) => {
    const [twin] = await tx
      .select()
      .from(deckCards)
      .where(
        and(
          eq(deckCards.deckId, input.deckId),
          eq(deckCards.board, row.entry.board),
          eq(deckCards.cardName, row.entry.cardName),
          eq(deckCards.isProxy, input.isProxy),
        ),
      )
      .limit(1);
    if (twin) {
      const [merged] = await tx
        .update(deckCards)
        .set({ quantity: twin.quantity + row.entry.quantity })
        .where(eq(deckCards.id, twin.id))
        .returning();
      await tx.delete(deckCards).where(eq(deckCards.id, row.entry.id));
      await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
      return merged!;
    }
    const [updated] = await tx
      .update(deckCards)
      .set({ isProxy: input.isProxy })
      .where(eq(deckCards.id, row.entry.id))
      .returning();
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
    return updated!;
  });
}

export async function deleteDeck(db: Database, input: { deckId: string; userId: string }) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, input.deckId)).limit(1);
  if (!deck) throw new DomainError('not_found', 'Deck não encontrado');
  if (deck.ownerId !== input.userId)
    throw new DomainError('forbidden', 'Apenas o dono remove o deck');
  await db.delete(decks).where(eq(decks.id, deck.id));
}
