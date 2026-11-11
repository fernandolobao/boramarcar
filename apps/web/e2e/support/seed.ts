/**
 * Popula um Postgres de teste com um grupo completo (membros, local, disponibilidade,
 * encontros, partidas e um deck) e gera a sessão de um usuário logado.
 * Usado pelos testes E2E autenticados (acessibilidade e fluxos).
 */
import { createHmac } from 'node:crypto';
import { createDb, schema, syncCollectionFromDecks } from '@boramarcar/db';

export const E2E_INVITE_CODE = 'E2ETESTE';
export const E2E_SESSION_TOKEN = 'e2e-session-ana';
export const E2E_IDS = {
  group: 'e2e-group',
  upcomingEvent: 'e2e-event-upcoming',
  pastEvent: 'e2e-event-past',
  deck: 'e2e-deck',
} as const;

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Valor do cookie `better-auth.session_token` (token assinado com HMAC-SHA256). */
export function signedSessionCookie(token: string, secret: string) {
  const signature = createHmac('sha256', secret).update(token).digest('base64');
  return encodeURIComponent(`${token}.${signature}`);
}

export async function seedE2E(databaseUrl: string) {
  const { db, pool } = createDb(databaseUrl, { max: 1 });
  const s = schema;
  try {
    await pool.query('truncate table "user", groups, cards restart identity cascade');

    const users = [
      { id: 'e2e-ana', name: 'Ana Teste', email: 'ana@e2e.test' },
      { id: 'e2e-bia', name: 'Bia', email: 'bia@e2e.test' },
      { id: 'e2e-caio', name: 'Caio', email: 'caio@e2e.test' },
      { id: 'e2e-duda', name: 'Duda', email: 'duda@e2e.test' },
    ];
    await db
      .insert(s.user)
      .values(users.map((u) => ({ ...u, emailVerified: true, timeZone: 'America/Sao_Paulo' })));
    await db.insert(s.session).values({
      id: 'e2e-session',
      token: E2E_SESSION_TOKEN,
      userId: 'e2e-ana',
      expiresAt: new Date(Date.now() + 7 * DAY),
    });

    await db.insert(s.groups).values({
      id: E2E_IDS.group,
      name: 'Mesa de Quinta',
      inviteCode: E2E_INVITE_CODE,
      createdBy: 'e2e-ana',
    });
    await db.insert(s.groupMembers).values(
      users.map((u, i) => ({
        groupId: E2E_IDS.group,
        userId: u.id,
        role: i === 0 ? ('owner' as const) : ('member' as const),
      })),
    );
    await db.insert(s.locations).values({
      id: 'e2e-loc',
      groupId: E2E_IDS.group,
      name: 'Casa da Ana',
      address: 'Rua das Flores, 123',
      details: 'Apto 42',
      lat: -30.0346,
      lng: -51.2177,
      hostUserId: 'e2e-ana',
      createdBy: 'e2e-ana',
    });

    // Disponibilidade na próxima semana: os 4 coincidem das 19h às 23h (UTC-3)
    const base = new Date(Date.now() + 7 * DAY);
    base.setUTCHours(22, 0, 0, 0);
    await db.insert(s.availabilitySlots).values(
      users.map((u, i) => ({
        id: `e2e-slot-${i}`,
        groupId: E2E_IDS.group,
        userId: u.id,
        startsAt: new Date(base.getTime() - i * HOUR),
        endsAt: new Date(base.getTime() + 4 * HOUR),
        note: i === 0 ? 'Levo pizza' : null,
      })),
    );
    await db
      .insert(s.availabilitySlotLocations)
      .values({ slotId: 'e2e-slot-0', locationId: 'e2e-loc' });

    // Regras semanais: Bia às quintas (19h–23h) e Ana aos sábados (14h–18h)
    await db.insert(s.availabilityRules).values([
      {
        id: 'e2e-rule-bia',
        groupId: E2E_IDS.group,
        userId: 'e2e-bia',
        weekday: 4,
        startTime: '19:00',
        endTime: '23:00',
        timeZone: 'America/Sao_Paulo',
      },
      {
        id: 'e2e-rule-ana',
        groupId: E2E_IDS.group,
        userId: 'e2e-ana',
        weekday: 6,
        startTime: '14:00',
        endTime: '18:00',
        timeZone: 'America/Sao_Paulo',
        note: 'Depois do almoço',
      },
    ]);

    await db.insert(s.events).values([
      {
        id: E2E_IDS.upcomingEvent,
        groupId: E2E_IDS.group,
        title: 'Commander de sábado',
        startsAt: base,
        endsAt: new Date(base.getTime() + 4 * HOUR),
        locationId: 'e2e-loc',
        createdBy: 'e2e-ana',
      },
      {
        id: E2E_IDS.pastEvent,
        groupId: E2E_IDS.group,
        title: 'Commander da semana passada',
        startsAt: new Date(Date.now() - 7 * DAY),
        status: 'finished',
        createdBy: 'e2e-bia',
      },
    ]);
    await db.insert(s.eventParticipants).values(
      users.flatMap((u, i) => [
        {
          eventId: E2E_IDS.upcomingEvent,
          userId: u.id,
          rsvp: i === 3 ? ('maybe' as const) : ('yes' as const),
        },
        { eventId: E2E_IDS.pastEvent, userId: u.id, rsvp: 'yes' as const },
      ]),
    );

    // Deck com cache de cartas
    await db.insert(s.cards).values([
      {
        scryfallId: 'e2e-omnath',
        name: 'Omnath, Locus of Mana',
        manaCost: '{2}{G}',
        cmc: 3,
        typeLine: 'Legendary Creature — Elemental',
        colorIdentity: ['G'],
        colors: ['G'],
        imageUri: 'https://cards.scryfall.io/normal/front/e/2/e2e-omnath.jpg',
      },
      {
        scryfallId: 'e2e-sol',
        name: 'Sol Ring',
        manaCost: '{1}',
        cmc: 1,
        typeLine: 'Artifact',
        oracleText: '{T}: Add {C}{C}.',
      },
      {
        scryfallId: 'e2e-cultivate',
        name: 'Cultivate',
        manaCost: '{2}{G}',
        cmc: 3,
        typeLine: 'Sorcery',
        setCode: 'm21',
        setName: 'Core Set 2021',
        collectorNumber: '178',
        artist: 'Anthony Palumbo',
        releasedAt: '2020-07-03',
        rarity: 'common',
        priceUsd: '0.30',
        oracleText:
          'Search your library for up to two basic land cards, put one onto the battlefield tapped and the other into your hand.',
        colorIdentity: ['G'],
        colors: ['G'],
      },
      {
        scryfallId: 'e2e-forest',
        name: 'Forest',
        cmc: 0,
        typeLine: 'Basic Land — Forest',
        colorIdentity: ['G'],
      },
    ]);
    await db
      .insert(s.decks)
      .values({ id: E2E_IDS.deck, ownerId: 'e2e-ana', name: 'Omnath Ramp', source: 'text' });
    await db.insert(s.deckCards).values([
      {
        deckId: E2E_IDS.deck,
        cardName: 'Omnath, Locus of Mana',
        scryfallId: 'e2e-omnath',
        board: 'commander',
      },
      { deckId: E2E_IDS.deck, cardName: 'Sol Ring', scryfallId: 'e2e-sol', isProxy: true },
      { deckId: E2E_IDS.deck, cardName: 'Cultivate', scryfallId: 'e2e-cultivate' },
      { deckId: E2E_IDS.deck, cardName: 'Forest', scryfallId: 'e2e-forest', quantity: 36 },
      { deckId: E2E_IDS.deck, cardName: 'Carta Inventada', quantity: 1, board: 'maybeboard' },
    ]);
    // Coleção da Ana a partir do deck (sem o Sol Ring, que é proxy, nem o maybeboard).
    await syncCollectionFromDecks(db, 'e2e-ana');

    // Partidas do encontro passado: uma vitória e um empate
    await db.insert(s.games).values([
      {
        id: 'e2e-game-1',
        eventId: E2E_IDS.pastEvent,
        groupId: E2E_IDS.group,
        number: 1,
        createdBy: 'e2e-bia',
      },
      {
        id: 'e2e-game-2',
        eventId: E2E_IDS.pastEvent,
        groupId: E2E_IDS.group,
        number: 2,
        createdBy: 'e2e-bia',
      },
      {
        id: 'e2e-game-3',
        eventId: E2E_IDS.pastEvent,
        groupId: E2E_IDS.group,
        number: 3,
        format: 'two_headed_giant',
        firstPlayerId: 'e2e-ana',
        winningTurn: 8,
        durationMinutes: 75,
        createdBy: 'e2e-ana',
      },
    ]);
    await db.insert(s.gamePlayers).values([
      ...users.map((u, i) => ({
        gameId: 'e2e-game-1',
        userId: u.id,
        result: i === 0 ? ('win' as const) : ('loss' as const),
        deckId: i === 0 ? E2E_IDS.deck : null,
        seat: i + 1,
      })),
      ...users.map((u) => ({ gameId: 'e2e-game-2', userId: u.id, result: 'draw' as const })),
      ...users.slice(0, 4).map((u, i) => ({
        gameId: 'e2e-game-3',
        userId: u.id,
        team: (i % 2) + 1,
        result: i % 2 === 0 ? ('win' as const) : ('loss' as const),
        deckId: i === 0 ? E2E_IDS.deck : null,
      })),
    ]);
  } finally {
    await pool.end();
  }
}
