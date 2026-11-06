import {
  analyzeDeck,
  artCropUrl,
  DECK_VISIBILITIES,
  isGameFormat,
  attachCardData,
  DomainError,
  mergeDeckLines,
  planDeckSync,
  splitLine,
  type CardData,
  type DeckBoard,
  type DeckEntry,
  type ImportedDeck,
} from '@boramarcar/core';
import { and, asc, count, desc, eq, inArray, or, sql, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../client';
import { cards, deckCards, decks, groupMembers, user } from '../schema';

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
      format: decks.format,
      visibility: decks.visibility,
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
    .select({ id: decks.id, name: decks.name, ownerId: decks.ownerId, format: decks.format })
    .from(decks)
    .where(inArray(decks.ownerId, [...userIds]))
    .orderBy(asc(decks.name));
}

/** Os dois usuários participam de algum grupo em comum? */
export async function sharesGroup(db: Database, a: string, b: string) {
  if (a === b) return true;
  const ga = alias(groupMembers, 'a_membership');
  const gb = alias(groupMembers, 'b_membership');
  const [shared] = await db
    .select({ groupId: ga.groupId })
    .from(ga)
    .innerJoin(gb, eq(ga.groupId, gb.groupId))
    .where(and(eq(ga.userId, a), eq(gb.userId, b)))
    .limit(1);
  return Boolean(shared);
}

/**
 * Visibilidade do deck (3.12): o dono sempre vê; `public` = qualquer pessoa com conta;
 * `group` = quem divide grupo com o dono; `private` = só o dono.
 */
async function canView(
  db: Database,
  deck: { ownerId: string; visibility: string },
  viewerId: string,
) {
  if (deck.ownerId === viewerId || deck.visibility === 'public') return true;
  if (deck.visibility === 'private') return false;
  return sharesGroup(db, deck.ownerId, viewerId);
}

export async function getDeck(db: Database, input: { deckId: string; viewerId: string }) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, input.deckId)).limit(1);
  if (!deck) throw new DomainError('not_found', 'Deck não encontrado');
  if (!(await canView(db, deck, input.viewerId))) {
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

  const [owner] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, deck.ownerId))
    .limit(1);
  return {
    ...deck,
    ownerName: owner?.name ?? '',
    isOwner: deck.ownerId === input.viewerId,
    entries,
    /** Uma linha por carta/board, com total e quantas cópias são proxy (3.6). */
    lines: mergeDeckLines(entries),
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

export interface DeckCover {
  /** Comandante(s) — ou a carta de capa quando o deck não tem comandante. */
  cards: { name: string; imageUri: string | null; artUri: string | null }[];
  /** Arte recortada da primeira carta, para miniaturas. */
  artUri: string | null;
  colorIdentity: string[];
}

/**
 * Capa de cada deck: o(s) comandante(s); sem comandante, a primeira lendária com imagem
 * ou, por fim, a primeira carta com imagem.
 */
export async function getDeckCovers(db: Database, deckIds: readonly string[]) {
  const covers = new Map<string, DeckCover>();
  const ids = [...new Set(deckIds)];
  if (!ids.length) return covers;
  const rows = await db
    .select({
      deckId: deckCards.deckId,
      board: deckCards.board,
      name: deckCards.cardName,
      imageUri: cards.imageUri,
      typeLine: cards.typeLine,
      colorIdentity: cards.colorIdentity,
    })
    .from(deckCards)
    .leftJoin(cards, eq(cards.scryfallId, deckCards.scryfallId))
    .where(
      and(
        inArray(deckCards.deckId, ids),
        or(eq(deckCards.board, 'commander'), eq(deckCards.board, 'mainboard')),
      ),
    )
    .orderBy(asc(deckCards.cardName));

  for (const id of ids) {
    const own = rows.filter((r) => r.deckId === id);
    const commanders = own.filter((r) => r.board === 'commander');
    const picked = commanders.length
      ? commanders
      : [
          own.find(
            (r) =>
              r.imageUri && r.typeLine?.includes('Legendary') && r.typeLine.includes('Creature'),
          ) ?? own.find((r) => r.imageUri),
        ].filter((r): r is (typeof own)[number] => Boolean(r));
    // Identidade: a do comandante; sem comandante, a união das cartas do deck.
    const identity = new Set(
      (commanders.length ? commanders : own).flatMap((c) => c.colorIdentity ?? []),
    );
    const list = picked.map((r) => ({
      name: r.name,
      imageUri: r.imageUri,
      artUri: artCropUrl(r.imageUri),
    }));
    covers.set(id, {
      cards: list,
      artUri: list.find((c) => c.artUri)?.artUri ?? null,
      colorIdentity: ['W', 'U', 'B', 'R', 'G'].filter((c) => identity.has(c)),
    });
  }
  return covers;
}

/** Renomeia o deck, muda o tipo de jogo ou a visibilidade (só o dono). */
export async function updateDeck(
  db: Database,
  input: { deckId: string; userId: string; name?: string; format?: string; visibility?: string },
) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, input.deckId)).limit(1);
  if (!deck) throw new DomainError('not_found', 'Deck não encontrado');
  if (deck.ownerId !== input.userId) {
    throw new DomainError('forbidden', 'Só o dono pode alterar o deck');
  }
  const changes: Partial<typeof decks.$inferInsert> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 120) {
      throw new DomainError('invalid_input', 'O nome do deck precisa de 1 a 120 caracteres');
    }
    changes.name = name;
  }
  if (input.format !== undefined) {
    if (!isGameFormat(input.format))
      throw new DomainError('invalid_input', 'Tipo de jogo inválido');
    changes.format = input.format;
  }
  if (input.visibility !== undefined) {
    if (!(DECK_VISIBILITIES as readonly string[]).includes(input.visibility)) {
      throw new DomainError('invalid_input', 'Visibilidade inválida');
    }
    changes.visibility = input.visibility;
  }
  if (!Object.keys(changes).length) return deck;
  const [updated] = await db.update(decks).set(changes).where(eq(decks.id, deck.id)).returning();
  return updated!;
}

async function requireOwnedDeck(db: Database, deckId: string, userId: string) {
  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  if (!deck) throw new DomainError('not_found', 'Deck não encontrado');
  if (deck.ownerId !== userId) throw new DomainError('forbidden', 'Apenas o dono edita o deck');
  return deck;
}

/**
 * Editor de deck (3.6/3.7): define quantas cópias de uma carta há num board e quantas são
 * proxy. Quantidade 0 remove a carta. `card` vem do Scryfall/cache (pode faltar: fica sem dados).
 */
export async function setDeckLine(
  db: Database,
  input: {
    deckId: string;
    userId: string;
    board: DeckBoard;
    name: string;
    quantity: number;
    proxies: number;
    card?: CardData | null;
  },
) {
  const name = input.card?.name ?? input.name.trim();
  if (!name) throw new DomainError('invalid_input', 'Informe a carta');
  const parts = splitLine(input.quantity, input.proxies);
  await requireOwnedDeck(db, input.deckId, input.userId);
  if (input.card) await upsertCards(db, [input.card]);

  await db.transaction(async (tx) => {
    await tx
      .delete(deckCards)
      .where(
        and(
          eq(deckCards.deckId, input.deckId),
          eq(deckCards.board, input.board),
          sql`lower(${deckCards.cardName}) = ${name.toLowerCase()}`,
        ),
      );
    if (parts.length) {
      await tx.insert(deckCards).values(
        parts.map((p) => ({
          deckId: input.deckId,
          cardName: name,
          scryfallId: input.card?.scryfallId ?? null,
          board: input.board,
          quantity: p.quantity,
          isProxy: p.isProxy,
        })),
      );
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
  });
  return { name, board: input.board, quantity: input.quantity, proxies: input.proxies };
}

/**
 * Sincroniza o deck com a lista nova da origem (3.8): quantidades da origem, proxies mantidos.
 * Retorna o que entrou, saiu e mudou.
 */
export async function syncDeckCards(
  db: Database,
  input: { deckId: string; userId: string; entries: DeckEntry[]; cards: readonly CardData[] },
) {
  await requireOwnedDeck(db, input.deckId, input.userId);
  const current = await db.select().from(deckCards).where(eq(deckCards.deckId, input.deckId));
  const plan = planDeckSync(
    mergeDeckLines(
      current.map((r) => ({
        id: r.id,
        name: r.cardName,
        board: r.board,
        quantity: r.quantity,
        isProxy: r.isProxy,
        card: null,
      })),
    ),
    input.entries,
  );
  await upsertCards(db, input.cards);
  const known = [...input.cards, ...(await findCachedCards(db, input.entries))];
  const linked = attachCardData(
    plan.rows.map((r) => r.entry),
    known,
  );
  await db.transaction(async (tx) => {
    await tx.delete(deckCards).where(eq(deckCards.deckId, input.deckId));
    if (plan.rows.length) {
      await tx.insert(deckCards).values(
        plan.rows.map((r, i) => ({
          deckId: input.deckId,
          cardName: linked[i]!.card?.name ?? r.name,
          scryfallId: linked[i]!.card?.scryfallId ?? null,
          board: r.board,
          quantity: r.quantity,
          isProxy: r.isProxy,
          isFoil: r.entry.isFoil ?? false,
        })),
      );
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
  });
  return { added: plan.added, removed: plan.removed, changed: plan.changed };
}

/** Busca no cache uma carta pelo nome exato (sem diferenciar maiúsculas). */
export async function findCachedCardByName(db: Database, name: string) {
  const [row] = await db
    .select()
    .from(cards)
    .where(sql`lower(${cards.name}) = ${name.trim().toLowerCase()}`)
    .limit(1);
  return row ? toCardData(row) : null;
}

/** Decks de um jogador que quem está vendo pode ver (perfil do jogador). */
export async function listDecksVisibleTo(
  db: Database,
  input: { ownerId: string; viewerId: string },
) {
  const all = await listDecks(db, input.ownerId);
  if (input.ownerId === input.viewerId) return all;
  const shared = await sharesGroup(db, input.ownerId, input.viewerId);
  return all.filter((d) => d.visibility === 'public' || (d.visibility === 'group' && shared));
}
