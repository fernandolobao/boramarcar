import {
  analyzeDeck,
  comparableCards,
  compareWithDecks,
  type AnalyzableCard,
  deckFormatProfile,
  deckListHash,
  estimateBracket,
  parseBracketSignals,
  spellbookDeck,
  type BracketSignals,
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
import { and, asc, count, desc, eq, inArray, isNull, or, sql, sum } from 'drizzle-orm';
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
        producedMana: c.producedMana ?? null,
        gameChanger: c.gameChanger ?? false,
        edhrecRank: c.edhrecRank ?? null,
        setCode: c.setCode ?? null,
        setName: c.setName ?? null,
        collectorNumber: c.collectorNumber ?? null,
        backImageUri: c.backImageUri ?? null,
        backName: c.backName ?? null,
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
        // Dados novos não apagam os já conhecidos (ex.: carta vinda de um cache antigo).
        producedMana: sql`coalesce(excluded.produced_mana, ${cards.producedMana})`,
        gameChanger: sql`excluded.game_changer`,
        edhrecRank: sql`coalesce(excluded.edhrec_rank, ${cards.edhrecRank})`,
        setCode: sql`coalesce(excluded.set_code, ${cards.setCode})`,
        setName: sql`coalesce(excluded.set_name, ${cards.setName})`,
        collectorNumber: sql`coalesce(excluded.collector_number, ${cards.collectorNumber})`,
        backImageUri: sql`excluded.back_image_uri`,
        backName: sql`excluded.back_name`,
        updatedAt: new Date(),
      },
    });
}

/** Busca no cache local as cartas de uma lista (por id Scryfall ou nome). */
export async function findCachedCards(
  db: Database,
  entries: readonly {
    name: string;
    scryfallId?: string;
    setCode?: string;
    collectorNumber?: string;
  }[],
): Promise<CardData[]> {
  const ids = [...new Set(entries.flatMap((e) => (e.scryfallId ? [e.scryfallId] : [])))];
  const names = [...new Set(entries.map((e) => e.name.toLowerCase()))];
  const prints = entries.flatMap((e) =>
    !e.scryfallId && e.setCode && e.collectorNumber
      ? [
          and(
            eq(cards.setCode, e.setCode.toLowerCase()),
            eq(cards.collectorNumber, e.collectorNumber),
          ),
        ]
      : [],
  );
  if (!ids.length && !names.length) return [];
  const rows = await db
    .select()
    .from(cards)
    .where(
      or(
        ids.length ? inArray(cards.scryfallId, ids) : undefined,
        names.length ? inArray(sql`lower(${cards.name})`, names) : undefined,
        ...prints,
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
    producedMana: card.producedMana,
    gameChanger: card.gameChanger,
    edhrecRank: card.edhrecRank,
    roles: card.roles,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    backImageUri: card.backImageUri,
    backName: card.backName,
  };
}

/** Data a partir da qual o cache guarda o verso das cartas de duas faces (migration 0009). */
const TWO_FACED_BACKFILL = new Date('2026-11-07T00:00:00Z');

/** Funções do Tagger valem por 30 dias. */
export const ROLES_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Cartas de um deck que precisam de dados novos (mana produzida ou funções do Tagger). */
export async function deckCardsForEnrichment(db: Database, deckId: string) {
  const rows = await db
    .selectDistinct({
      scryfallId: cards.scryfallId,
      name: cards.name,
      producedMana: cards.producedMana,
      setCode: cards.setCode,
      backImageUri: cards.backImageUri,
      cardUpdatedAt: cards.updatedAt,
      rolesCheckedAt: cards.rolesCheckedAt,
      typeLine: cards.typeLine,
    })
    .from(deckCards)
    .innerJoin(cards, eq(cards.scryfallId, deckCards.scryfallId))
    .where(eq(deckCards.deckId, deckId));
  const cutoff = Date.now() - ROLES_TTL_MS;
  return {
    // Cache antigo: sem mana produzida ou sem a edição — relê a carta no Scryfall.
    missingMana: rows
      .filter(
        (r) =>
          r.producedMana === null ||
          r.setCode === null ||
          // Cache anterior ao verso das cartas de duas faces: relê uma vez.
          (r.name.includes(' // ') &&
            r.backImageUri === null &&
            r.cardUpdatedAt < TWO_FACED_BACKFILL),
      )
      .map((r) => r.scryfallId),
    staleRoles: rows
      .filter((r) => !r.rolesCheckedAt || r.rolesCheckedAt.getTime() < cutoff)
      .map((r) => ({ scryfallId: r.scryfallId, name: r.name })),
  };
}

/** Grava as funções do Tagger (lista vazia = consultada e sem funções). */
export async function saveCardRoles(
  db: Database,
  items: readonly { scryfallId: string; roles: readonly string[] }[],
) {
  const now = new Date();
  for (const item of items) {
    await db
      .update(cards)
      .set({ roles: [...item.roles], rolesCheckedAt: now })
      .where(eq(cards.scryfallId, item.scryfallId));
  }
}

/** Guarda os sinais do Commander Spellbook para a lista atual do deck. */
export async function saveBracketSignals(
  db: Database,
  input: { deckId: string; hash: string; signals: BracketSignals },
) {
  await db
    .update(decks)
    // Mantém `updated_at`: é um cache, não uma edição do dono.
    .set({
      bracketSignals: input.signals,
      bracketHash: input.hash,
      updatedAt: sql`${decks.updatedAt}`,
    })
    .where(eq(decks.id, input.deckId));
}

/** Salva um deck importado junto com o cache das cartas encontradas no Scryfall. */
export async function saveImportedDeck(
  db: Database,
  input: { ownerId: string; deck: ImportedDeck; cards: readonly CardData[]; format?: string },
) {
  const format = input.format ?? 'commander';
  if (!isGameFormat(format)) throw new DomainError('invalid_input', 'Formato inválido');
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
        format,
        source: input.deck.source,
        sourceId: input.deck.sourceId ?? null,
        sourceUrl: input.deck.sourceUrl ?? null,
      })
      .returning();
    // Entradas diferentes podem cair na mesma impressão (ex.: edição não encontrada → padrão).
    const rows = new Map<string, typeof deckCards.$inferInsert>();
    for (const entry of linked) {
      const row = {
        deckId: deck!.id,
        cardName: entry.card?.name ?? entry.name,
        scryfallId: entry.card?.scryfallId ?? null,
        quantity: entry.quantity,
        board: entry.board,
        isProxy: entry.isProxy ?? false,
        isFoil: entry.isFoil ?? false,
      };
      const key = `${row.board}|${row.cardName.toLowerCase()}|${row.scryfallId}|${row.isProxy}`;
      const existing = rows.get(key);
      if (existing) existing.quantity = (existing.quantity ?? 0) + row.quantity;
      else rows.set(key, row);
    }
    await tx.insert(deckCards).values([...rows.values()]);
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
    scryfallId: entry.scryfallId,
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
  const analysis = analyzeDeck(entries, deck.format);
  const profile = deckFormatProfile(deck.format);
  const hash = deckListHash(spellbookDeck(entries));
  const stored = deck.bracketHash === hash ? parseBracketSignals(deck.bracketSignals) : null;
  const bracket = profile.brackets
    ? {
        ...estimateBracket(
          stored ?? {
            gameChangers: analysis.gameChangers,
            massLandDenial: [],
            extraTurns: [],
            combos: [],
          },
        ),
        /** `spellbook` = combos e cartas conferidos; `local` = só os Game Changers. */
        source: stored ? ('spellbook' as const) : ('local' as const),
      }
    : null;
  const roleCutoff = Date.now() - ROLES_TTL_MS;
  const analysisStale =
    rows.some(
      ({ card }) =>
        card &&
        (card.producedMana === null ||
          card.setCode === null ||
          (card.name.includes(' // ') &&
            card.backImageUri === null &&
            card.updatedAt < TWO_FACED_BACKFILL) ||
          !card.rolesCheckedAt ||
          card.rolesCheckedAt.getTime() < roleCutoff),
    ) ||
    (profile.brackets && !stored);
  const { bracketSignals: _signals, bracketHash: _hash, ...deckFields } = deck;
  return {
    ...deckFields,
    ownerName: owner?.name ?? '',
    isOwner: deck.ownerId === input.viewerId,
    entries,
    /** Uma linha por carta/board, com total e quantas cópias são proxy (3.6). */
    lines: mergeDeckLines(entries),
    analysis,
    bracket,
    analysisStale,
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
          samePrint(row.entry.scryfallId),
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

/** Filtro "mesma impressão" (id do Scryfall ou linha sem dados). */
const samePrint = (scryfallId: string | null | undefined) =>
  scryfallId ? eq(deckCards.scryfallId, scryfallId) : isNull(deckCards.scryfallId);

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
    /** Impressão da linha a alterar; sem valor, a linha da carta pela impressão de `card`. */
    scryfallId?: string | null;
  },
) {
  const name = input.card?.name ?? input.name.trim();
  const print =
    input.scryfallId !== undefined ? input.scryfallId : (input.card?.scryfallId ?? null);
  // Sem impressão nem carta (ex.: remover pelo nome): vale para todas as edições da carta.
  const anyPrint = input.scryfallId === undefined && !input.card;
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
          anyPrint ? undefined : samePrint(print),
        ),
      );
    if (parts.length) {
      await tx.insert(deckCards).values(
        parts.map((p) => ({
          deckId: input.deckId,
          cardName: name,
          scryfallId: print,
          board: input.board,
          quantity: p.quantity,
          isProxy: p.isProxy,
        })),
      );
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
  });
  return {
    name,
    board: input.board,
    scryfallId: print,
    quantity: input.quantity,
    proxies: input.proxies,
  };
}

/**
 * Troca a edição (impressão) de `quantity` cópias de uma linha. Cópias reais vão primeiro; se
 * faltar, entram as proxy (que continuam proxy). Junta com a linha da nova edição se já existir.
 */
export async function moveLinePrint(
  db: Database,
  input: {
    deckId: string;
    userId: string;
    board: DeckBoard;
    name: string;
    fromScryfallId: string | null;
    card: CardData;
    quantity: number;
  },
) {
  await requireOwnedDeck(db, input.deckId, input.userId);
  if (input.card.name.toLowerCase() !== input.name.trim().toLowerCase()) {
    throw new DomainError('invalid_input', 'A edição escolhida é de outra carta');
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new DomainError('invalid_input', 'Informe quantas cópias mudam de edição');
  }
  if (input.fromScryfallId === input.card.scryfallId) return { moved: 0 };
  await upsertCards(db, [input.card]);
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(deckCards)
      .where(
        and(
          eq(deckCards.deckId, input.deckId),
          eq(deckCards.board, input.board),
          sql`lower(${deckCards.cardName}) = ${input.name.trim().toLowerCase()}`,
          samePrint(input.fromScryfallId),
        ),
      );
    const total = rows.reduce((sum, r) => sum + r.quantity, 0);
    if (!total) throw new DomainError('not_found', 'Carta não encontrada no deck');
    if (input.quantity > total) {
      throw new DomainError('invalid_input', `O deck tem só ${total} cópias desta edição`);
    }
    let left = input.quantity;
    // Reais primeiro, depois proxies.
    for (const row of [...rows].sort((a, b) => Number(a.isProxy) - Number(b.isProxy))) {
      if (!left) break;
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
        .where(
          and(
            eq(deckCards.deckId, input.deckId),
            eq(deckCards.board, input.board),
            eq(deckCards.cardName, input.card.name),
            eq(deckCards.scryfallId, input.card.scryfallId),
            eq(deckCards.isProxy, row.isProxy),
          ),
        )
        .limit(1);
      if (twin) {
        await tx
          .update(deckCards)
          .set({ quantity: twin.quantity + take })
          .where(eq(deckCards.id, twin.id));
      } else {
        await tx.insert(deckCards).values({
          deckId: input.deckId,
          cardName: input.card.name,
          scryfallId: input.card.scryfallId,
          board: input.board,
          quantity: take,
          isProxy: row.isProxy,
          isFoil: row.isFoil,
        });
      }
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, input.deckId));
    return { moved: input.quantity };
  });
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
  await upsertCards(db, input.cards);
  const known = [...input.cards, ...(await findCachedCards(db, input.entries))];
  // Associa antes de planejar: a impressão (scryfallId) faz parte da chave da linha.
  const incoming = attachCardData(input.entries, known).map(({ card, ...entry }) => ({
    ...entry,
    name: card?.name ?? entry.name,
    ...(card ? { scryfallId: card.scryfallId } : {}),
  }));
  const plan = planDeckSync(
    mergeDeckLines(
      current.map((r) => ({
        id: r.id,
        name: r.cardName,
        board: r.board,
        quantity: r.quantity,
        isProxy: r.isProxy,
        scryfallId: r.scryfallId,
        card: null,
      })),
    ),
    incoming,
  );
  await db.transaction(async (tx) => {
    await tx.delete(deckCards).where(eq(deckCards.deckId, input.deckId));
    if (plan.rows.length) {
      await tx.insert(deckCards).values(
        plan.rows.map((r) => ({
          deckId: input.deckId,
          cardName: r.name,
          scryfallId: r.entry.scryfallId ?? null,
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

/** Cartas usadas em algum deck com cache mais antigo que `olderThan` (mais antigas primeiro). */
export async function staleDeckCards(db: Database, input: { olderThan: Date; limit: number }) {
  return db
    .select({ scryfallId: cards.scryfallId, name: cards.name })
    .from(cards)
    .where(
      and(
        sql`${cards.updatedAt} < ${input.olderThan}`,
        sql`exists (select 1 from ${deckCards} where ${deckCards.scryfallId} = ${cards.scryfallId})`,
      ),
    )
    .orderBy(asc(cards.updatedAt))
    .limit(input.limit);
}

/** Marca cartas como verificadas agora (sem mudar os dados). */
export async function touchCards(db: Database, ids: readonly string[]) {
  if (!ids.length) return;
  await db
    .update(cards)
    .set({ updatedAt: new Date() })
    .where(inArray(cards.scryfallId, [...ids]));
}

/** Ids de quem divide algum grupo com a pessoa (incluindo ela mesma). */
async function groupMatesOf(db: Database, userId: string) {
  const mine = alias(groupMembers, 'mine');
  const rows = await db
    .selectDistinct({ userId: groupMembers.userId })
    .from(groupMembers)
    .innerJoin(mine, eq(mine.groupId, groupMembers.groupId))
    .where(eq(mine.userId, userId));
  return new Set([userId, ...rows.map((r) => r.userId)]);
}

/** Máximo de decks na média, para a consulta continuar leve. */
export const COMPARISON_MAX_DECKS = 50;

/**
 * Comparação (4.10) com outros decks do **mesmo comandante** (mesmo conjunto de comandantes)
 * cadastrados no app que a pessoa pode ver: os próprios, os públicos e os de grupo de quem divide
 * grupo com ela. O EDHREC não permite consultas automáticas, então a base é a do próprio app.
 */
export async function compareWithCommanderDecks(
  db: Database,
  input: {
    deckId: string;
    viewerId: string;
    format: string;
    commanders: readonly string[];
    entries: readonly AnalyzableCard[];
  },
) {
  const wanted = [...new Set(input.commanders.map((c) => c.toLowerCase()))].sort();
  if (!wanted.length) return null;
  const candidates = await db
    .select({ deckId: deckCards.deckId, name: deckCards.cardName })
    .from(deckCards)
    .where(
      and(
        eq(deckCards.board, 'commander'),
        inArray(
          deckCards.deckId,
          db
            .select({ id: deckCards.deckId })
            .from(deckCards)
            .where(
              and(
                eq(deckCards.board, 'commander'),
                sql`lower(${deckCards.cardName}) = ${wanted[0]}`,
              ),
            ),
        ),
      ),
    );
  const byDeck = new Map<string, Set<string>>();
  for (const c of candidates) {
    if (c.deckId === input.deckId) continue;
    const set = byDeck.get(c.deckId) ?? new Set<string>();
    set.add(c.name.toLowerCase());
    byDeck.set(c.deckId, set);
  }
  const sameCommanders = [...byDeck]
    .filter(([, names]) => [...names].sort().join('|') === wanted.join('|'))
    .map(([id]) => id);

  const mates = await groupMatesOf(db, input.viewerId);
  const visible = sameCommanders.length
    ? (
        await db
          .select({
            id: decks.id,
            ownerId: decks.ownerId,
            visibility: decks.visibility,
            format: decks.format,
          })
          .from(decks)
          .where(inArray(decks.id, sameCommanders))
          .orderBy(desc(decks.updatedAt))
      )
        .filter(
          (d) =>
            d.ownerId === input.viewerId ||
            d.visibility === 'public' ||
            (d.visibility === 'group' && mates.has(d.ownerId)),
        )
        .slice(0, COMPARISON_MAX_DECKS)
    : [];

  const rows = visible.length
    ? await db
        .select({ entry: deckCards, card: cards })
        .from(deckCards)
        .leftJoin(cards, eq(cards.scryfallId, deckCards.scryfallId))
        .where(
          inArray(
            deckCards.deckId,
            visible.map((d) => d.id),
          ),
        )
    : [];
  const others = visible.map((d) => {
    const entries: AnalyzableCard[] = rows
      .filter((r) => r.entry.deckId === d.id)
      .map(({ entry, card }) => ({
        name: entry.cardName,
        quantity: entry.quantity,
        board: entry.board,
        isProxy: entry.isProxy,
        card: card ? toCardData(card) : null,
      }));
    return { analysis: analyzeDeck(entries, d.format), cards: comparableCards(entries) };
  });
  const target = {
    analysis: analyzeDeck(input.entries, input.format),
    cards: comparableCards(input.entries),
  };
  return compareWithDecks(target, others);
}
