/**
 * Matriz de autorização (roadmap 8.1): cada rota da API com recurso de outra pessoa ou de outro
 * grupo é chamada por quem não deveria ter acesso, e a resposta precisa ser 403/404 **sem** os
 * dados do recurso no corpo. Rotas novas com ID na URL entram aqui (ver CLAUDE.md).
 */
import { mapScryfallCard, type ImportedDeck } from '@boramarcar/core';
import {
  addAvailability,
  addAvailabilityRule,
  addCollectionCard,
  createEvent,
  createGroup,
  createLocation,
  createSeason,
  getDeck,
  joinGroup,
  listCollection,
  recordGame,
  saveImportedDeck,
  updateDeck,
} from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const r = {
  ruleExceptions: await import('../availability-rules/[ruleId]/exceptions/route'),
  rule: await import('../availability-rules/[ruleId]/route'),
  slot: await import('../availability/[slotId]/route'),
  collectionEntry: await import('../collection/[entryId]/route'),
  alternatives: await import('../decks/[deckId]/alternatives/route'),
  analysis: await import('../decks/[deckId]/analysis/route'),
  deckCard: await import('../decks/[deckId]/cards/[cardId]/route'),
  exportDeck: await import('../decks/[deckId]/export/route'),
  linePrint: await import('../decks/[deckId]/lines/print/route'),
  lines: await import('../decks/[deckId]/lines/route'),
  proxies: await import('../decks/[deckId]/proxies/route'),
  deck: await import('../decks/[deckId]/route'),
  sync: await import('../decks/[deckId]/sync/route'),
  eventGames: await import('../events/[eventId]/games/route'),
  ics: await import('../events/[eventId]/ics/route'),
  event: await import('../events/[eventId]/route'),
  rsvp: await import('../events/[eventId]/rsvp/route'),
  table: await import('../events/[eventId]/table/route'),
  game: await import('../games/[gameId]/route'),
  groupRules: await import('../groups/[groupId]/availability-rules/route'),
  range: await import('../groups/[groupId]/availability/range/route'),
  availability: await import('../groups/[groupId]/availability/route'),
  windows: await import('../groups/[groupId]/availability/windows/route'),
  events: await import('../groups/[groupId]/events/route'),
  history: await import('../groups/[groupId]/events/history/route'),
  invite: await import('../groups/[groupId]/invite/route'),
  location: await import('../groups/[groupId]/locations/[locationId]/route'),
  locations: await import('../groups/[groupId]/locations/route'),
  member: await import('../groups/[groupId]/members/[userId]/route'),
  members: await import('../groups/[groupId]/members/route'),
  ranking: await import('../groups/[groupId]/ranking/route'),
  seasons: await import('../groups/[groupId]/seasons/route'),
  settings: await import('../groups/[groupId]/settings/route'),
  stats: await import('../groups/[groupId]/stats/route'),
  beta: await import('../groups/[groupId]/beta/route'),
  transfer: await import('../groups/[groupId]/transfer/route'),
  activeGroup: await import('../me/active-group/route'),
  player: await import('../players/[userId]/route'),
  season: await import('../seasons/[seasonId]/route'),
};

type U = Awaited<ReturnType<typeof createTestUser>>;
type Handler = (req: Request, ctx: { params: Promise<never> }) => Promise<Response>;

/** Chama a rota e devolve o corpo cru (texto), para procurar vazamentos em qualquer formato. */
async function hit(
  handler: Handler,
  method: string,
  params: Record<string, string>,
  body?: unknown,
) {
  // `__query` vira a query string (ex.: rotas GET com parâmetros obrigatórios).
  const { __query: query = '', ...routeParams } = params;
  const req = new Request(`http://localhost/${query}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await handler(req, { params: Promise.resolve(routeParams as never) });
  return { status: res.status, text: await res.text() };
}

/** Nada que identifique os dados do grupo secreto pode aparecer em respostas negadas. */
const SECRET = /secret|rua escondida|ana-dona@/i;

let close: () => Promise<void>;
let ana: U, bia: U, otto: U;
const ids: Record<string, string> = {};

const cards = [
  mapScryfallCard({
    id: 'omnath',
    name: 'Omnath, Locus of Mana',
    cmc: 3,
    mana_cost: '{2}{G}',
    type_line: 'Legendary Creature — Elemental',
    color_identity: ['G'],
    set: 'tst',
    collector_number: '1',
    legalities: { commander: 'legal' },
  }),
  mapScryfallCard({
    id: 'forest',
    name: 'Forest',
    cmc: 0,
    type_line: 'Basic Land — Forest',
    color_identity: ['G'],
    set: 'tst',
    collector_number: '2',
    legalities: { commander: 'legal' },
  }),
];
const deck = (name: string): ImportedDeck => ({
  name,
  source: 'text',
  entries: [
    { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander', scryfallId: 'omnath' },
    { name: 'Forest', quantity: 30, board: 'mainboard', scryfallId: 'forest' },
  ],
});

beforeAll(async () => {
  const testDb = await createTestDb();
  const db = testDb.db;
  testState.db = db;
  close = testDb.close;
  // Ana é dona do "Grupo Secreto"; Bia é membro comum; Otto não tem nada a ver com eles.
  ana = await createTestUser(db, { name: 'Ana Secreta', email: 'ana-dona@example.com' });
  bia = await createTestUser(db, { name: 'Bia' });
  otto = await createTestUser(db, { name: 'Otto' });
  const group = await createGroup(db, { name: 'Grupo Secreto', userId: ana.id });
  await joinGroup(db, { inviteCode: group.inviteCode, userId: bia.id });
  await createGroup(db, { name: 'Mesa do Otto', userId: otto.id });
  ids.group = group.id;

  const location = await createLocation(db, {
    groupId: group.id,
    userId: ana.id,
    name: 'Casa Secreta',
    address: 'Rua Escondida, 123',
  });
  ids.location = location.id;
  const event = await createEvent(db, {
    groupId: group.id,
    userId: ana.id,
    title: 'Encontro Secreto',
    startsAt: new Date(Date.now() - 2 * 864e5),
    locationId: location.id,
    participantIds: [ana.id, bia.id],
  });
  ids.event = event.id;
  const game = await recordGame(db, {
    eventId: event.id,
    userId: ana.id,
    format: 'standard',
    players: [
      { userId: ana.id, result: 'win' },
      { userId: bia.id, result: 'loss' },
    ],
  });
  ids.game = game.id;
  const season = await createSeason(db, {
    groupId: group.id,
    userId: ana.id,
    name: 'Temporada Secreta',
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-12-31'),
  });
  ids.season = season.id;
  const slot = await addAvailability(db, {
    groupId: group.id,
    userId: ana.id,
    startsAt: new Date(Date.now() + 864e5),
    endsAt: new Date(Date.now() + 864e5 + 3 * 36e5),
    note: 'Nota secreta',
  });
  ids.slot = slot.id;
  const rule = await addAvailabilityRule(db, {
    groupId: group.id,
    userId: ana.id,
    weekday: 5,
    startTime: '19:00',
    endTime: '23:00',
    timeZone: 'America/Sao_Paulo',
    note: 'Regra secreta',
  });
  ids.rule = rule.id;

  const privateDeck = await saveImportedDeck(db, {
    ownerId: ana.id,
    deck: deck('Deck Secreto Privado'),
    cards,
  });
  await updateDeck(db, { deckId: privateDeck.id, userId: ana.id, visibility: 'private' });
  ids.privateDeck = privateDeck.id;
  const groupDeck = await saveImportedDeck(db, {
    ownerId: ana.id,
    deck: deck('Deck Secreto do Grupo'),
    cards,
  });
  await updateDeck(db, { deckId: groupDeck.id, userId: ana.id, visibility: 'group' });
  ids.groupDeck = groupDeck.id;

  for (const key of ['privateDeck', 'groupDeck'] as const) {
    const detail = await getDeck(db, { deckId: ids[key]!, viewerId: ana.id });
    ids[`${key}Card`] = detail.lines[0]!.ids[0]!;
  }

  await addCollectionCard(db, { userId: ana.id, card: cards[0]!, quantity: 1, foil: false });
  const collection = await listCollection(db, ana.id);
  ids.collectionEntry = collection[0]!.id;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
});

type Case = [
  label: string,
  handler: Handler,
  method: string,
  params: () => Record<string, string>,
  body?: unknown,
];

const deckLine = { name: 'Forest', board: 'mainboard', quantity: 31, proxies: 0 };
const deckCases = (key: 'privateDeck' | 'groupDeck'): Case[] => [
  [`GET deck (${key})`, r.deck.GET as Handler, 'GET', () => ({ deckId: ids[key]! })],
  [
    `PATCH deck (${key})`,
    r.deck.PATCH as Handler,
    'PATCH',
    () => ({ deckId: ids[key]! }),
    { name: 'X' },
  ],
  [`DELETE deck (${key})`, r.deck.DELETE as Handler, 'DELETE', () => ({ deckId: ids[key]! })],
  [`export (${key})`, r.exportDeck.GET as Handler, 'GET', () => ({ deckId: ids[key]! })],
  [`proxies (${key})`, r.proxies.GET as Handler, 'GET', () => ({ deckId: ids[key]! })],
  [
    `alternativas (${key})`,
    r.alternatives.GET as Handler,
    'GET',
    () => ({ deckId: ids[key]!, __query: '?role=ramp' }),
  ],
  [`análise (${key})`, r.analysis.POST as Handler, 'POST', () => ({ deckId: ids[key]! })],
  [`sync (${key})`, r.sync.POST as Handler, 'POST', () => ({ deckId: ids[key]! }), {}],
  [`linha PUT (${key})`, r.lines.PUT as Handler, 'PUT', () => ({ deckId: ids[key]! }), deckLine],
  [
    `linha POST (${key})`,
    r.lines.POST as Handler,
    'POST',
    () => ({ deckId: ids[key]! }),
    { name: 'Forest', board: 'mainboard', quantity: 1, proxies: 0 },
  ],
  [
    `edição (${key})`,
    r.linePrint.POST as Handler,
    'POST',
    () => ({ deckId: ids[key]! }),
    {
      name: 'Forest',
      board: 'mainboard',
      fromScryfallId: 'forest',
      toScryfallId: 'forest',
      quantity: 1,
    },
  ],
  [
    `proxy da carta (${key})`,
    r.deckCard.PATCH as Handler,
    'PATCH',
    () => ({ deckId: ids[key]!, cardId: ids[`${key}Card`]! }),
    { isProxy: true },
  ],
];

/** Tudo do grupo secreto e da Ana, visto por quem não é do grupo (Otto). */
const outsiderCases: Case[] = [
  ['GET grupo: membros', r.members.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: ranking', r.ranking.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: estatísticas', r.stats.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: faixa do beta', r.beta.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: temporadas', r.seasons.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: configurações', r.settings.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: locais', r.locations.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: encontros', r.events.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  ['GET grupo: histórico', r.history.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  [
    'GET grupo: disponibilidade',
    r.availability.GET as Handler,
    'GET',
    () => ({ groupId: ids.group! }),
  ],
  ['GET grupo: janelas', r.windows.GET as Handler, 'GET', () => ({ groupId: ids.group! })],
  [
    'GET grupo: regras semanais',
    r.groupRules.GET as Handler,
    'GET',
    () => ({ groupId: ids.group! }),
  ],
  [
    'POST grupo: encontro',
    r.events.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    { title: 'Intruso', startsAt: new Date(Date.now() + 864e5).toISOString() },
  ],
  [
    'POST grupo: disponibilidade',
    r.availability.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    {
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      endsAt: new Date(Date.now() + 2 * 864e5).toISOString(),
    },
  ],
  [
    'PUT grupo: disponibilidade por período',
    r.range.PUT as Handler,
    'PUT',
    () => ({ groupId: ids.group! }),
    { start: '2026-12-01', end: '2026-12-02', available: true },
  ],
  [
    'POST grupo: regra semanal',
    r.groupRules.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    { weekdays: [1], startTime: '19:00', endTime: '22:00', timeZone: 'America/Sao_Paulo' },
  ],
  [
    'POST grupo: local',
    r.locations.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    { name: 'Intruso' },
  ],
  [
    'PATCH grupo: local',
    r.location.PATCH as Handler,
    'PATCH',
    () => ({ groupId: ids.group!, locationId: ids.location! }),
    { name: 'Intruso' },
  ],
  [
    'DELETE grupo: local',
    r.location.DELETE as Handler,
    'DELETE',
    () => ({ groupId: ids.group!, locationId: ids.location! }),
  ],
  [
    'POST grupo: temporada',
    r.seasons.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    { name: 'Intrusa', startsAt: '2026-01-01', endsAt: '2026-02-01' },
  ],
  [
    'PATCH grupo: configurações',
    r.settings.PATCH as Handler,
    'PATCH',
    () => ({ groupId: ids.group! }),
    { tableSize: 3 },
  ],
  ['POST grupo: trocar convite', r.invite.POST as Handler, 'POST', () => ({ groupId: ids.group! })],
  [
    'PATCH grupo: papel de membro',
    r.member.PATCH as Handler,
    'PATCH',
    () => ({ groupId: ids.group!, userId: bia.id }),
    { role: 'admin' },
  ],
  [
    'DELETE grupo: membro',
    r.member.DELETE as Handler,
    'DELETE',
    () => ({ groupId: ids.group!, userId: bia.id }),
  ],
  [
    'POST grupo: transferir posse',
    r.transfer.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    () => ({ userId: otto.id }),
  ],
  [
    'PUT grupo ativo alheio',
    r.activeGroup.PUT as Handler,
    'PUT',
    () => ({}),
    () => ({ groupId: ids.group! }),
  ],
  ['GET encontro', r.event.GET as Handler, 'GET', () => ({ eventId: ids.event! })],
  [
    'PATCH encontro',
    r.event.PATCH as Handler,
    'PATCH',
    () => ({ eventId: ids.event! }),
    { title: 'Intruso' },
  ],
  ['GET encontro: .ics', r.ics.GET as Handler, 'GET', () => ({ eventId: ids.event! })],
  ['GET encontro: mesa', r.table.GET as Handler, 'GET', () => ({ eventId: ids.event! })],
  [
    'PUT encontro: presença',
    r.rsvp.PUT as Handler,
    'PUT',
    () => ({ eventId: ids.event! }),
    { rsvp: 'yes' },
  ],
  [
    'POST encontro: partida',
    r.eventGames.POST as Handler,
    'POST',
    () => ({ eventId: ids.event! }),
    () => ({
      format: 'standard',
      players: [
        { userId: otto.id, result: 'win' },
        { userId: ana.id, result: 'loss' },
      ],
    }),
  ],
  [
    'PUT partida',
    r.game.PUT as Handler,
    'PUT',
    () => ({ gameId: ids.game! }),
    () => ({
      format: 'standard',
      players: [
        { userId: ana.id, result: 'loss' },
        { userId: bia.id, result: 'win' },
      ],
    }),
  ],
  ['DELETE partida', r.game.DELETE as Handler, 'DELETE', () => ({ gameId: ids.game! })],
  ['DELETE temporada', r.season.DELETE as Handler, 'DELETE', () => ({ seasonId: ids.season! })],
  [
    'DELETE horário de outra pessoa',
    r.slot.DELETE as Handler,
    'DELETE',
    () => ({ slotId: ids.slot! }),
  ],
  [
    'DELETE regra de outra pessoa',
    r.rule.DELETE as Handler,
    'DELETE',
    () => ({ ruleId: ids.rule! }),
  ],
  [
    'PUT exceção em regra de outra pessoa',
    r.ruleExceptions.PUT as Handler,
    'PUT',
    () => ({ ruleId: ids.rule! }),
    { date: '2026-12-04', skip: true },
  ],
  [
    'PATCH coleção de outra pessoa',
    r.collectionEntry.PATCH as Handler,
    'PATCH',
    () => ({ entryId: ids.collectionEntry! }),
    { quantity: 5 },
  ],
  [
    'DELETE coleção de outra pessoa',
    r.collectionEntry.DELETE as Handler,
    'DELETE',
    () => ({ entryId: ids.collectionEntry! }),
  ],
  [
    'GET perfil de quem não divide grupo',
    r.player.GET as Handler,
    'GET',
    () => ({ userId: ana.id }),
  ],
  ...deckCases('privateDeck'),
  ...deckCases('groupDeck'),
];

/** O que só a dona (ou admin) pode fazer, visto por um membro comum do mesmo grupo (Bia). */
const memberCases: Case[] = [
  [
    'PATCH configurações',
    r.settings.PATCH as Handler,
    'PATCH',
    () => ({ groupId: ids.group! }),
    { tableSize: 3 },
  ],
  ['POST trocar convite', r.invite.POST as Handler, 'POST', () => ({ groupId: ids.group! })],
  [
    'PATCH papel da dona',
    r.member.PATCH as Handler,
    'PATCH',
    () => ({ groupId: ids.group!, userId: ana.id }),
    { role: 'member' },
  ],
  [
    'DELETE a dona',
    r.member.DELETE as Handler,
    'DELETE',
    () => ({ groupId: ids.group!, userId: ana.id }),
  ],
  [
    'POST transferir posse',
    r.transfer.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    () => ({ userId: bia.id }),
  ],
  [
    'POST temporada',
    r.seasons.POST as Handler,
    'POST',
    () => ({ groupId: ids.group! }),
    { name: 'Da Bia', startsAt: '2026-01-01', endsAt: '2026-02-01' },
  ],
  ['DELETE temporada', r.season.DELETE as Handler, 'DELETE', () => ({ seasonId: ids.season! })],
  ['DELETE horário da Ana', r.slot.DELETE as Handler, 'DELETE', () => ({ slotId: ids.slot! })],
  ['DELETE regra da Ana', r.rule.DELETE as Handler, 'DELETE', () => ({ ruleId: ids.rule! })],
  [
    'PUT exceção na regra da Ana',
    r.ruleExceptions.PUT as Handler,
    'PUT',
    () => ({ ruleId: ids.rule! }),
    { date: '2026-12-04', skip: true },
  ],
  [
    'PATCH coleção da Ana',
    r.collectionEntry.PATCH as Handler,
    'PATCH',
    () => ({ entryId: ids.collectionEntry! }),
    { quantity: 5 },
  ],
  [
    'DELETE coleção da Ana',
    r.collectionEntry.DELETE as Handler,
    'DELETE',
    () => ({ entryId: ids.collectionEntry! }),
  ],
  ['GET deck privado da Ana', r.deck.GET as Handler, 'GET', () => ({ deckId: ids.privateDeck! })],
  [
    'GET export do deck privado',
    r.exportDeck.GET as Handler,
    'GET',
    () => ({ deckId: ids.privateDeck! }),
  ],
  [
    'PATCH deck do grupo',
    r.deck.PATCH as Handler,
    'PATCH',
    () => ({ deckId: ids.groupDeck! }),
    { name: 'X' },
  ],
  ['DELETE deck do grupo', r.deck.DELETE as Handler, 'DELETE', () => ({ deckId: ids.groupDeck! })],
  [
    'linha PUT no deck do grupo',
    r.lines.PUT as Handler,
    'PUT',
    () => ({ deckId: ids.groupDeck! }),
    deckLine,
  ],
  [
    'linha POST no deck do grupo',
    r.lines.POST as Handler,
    'POST',
    () => ({ deckId: ids.groupDeck! }),
    { name: 'Forest', board: 'mainboard', quantity: 1, proxies: 0 },
  ],
  [
    'edição no deck do grupo',
    r.linePrint.POST as Handler,
    'POST',
    () => ({ deckId: ids.groupDeck! }),
    {
      name: 'Forest',
      board: 'mainboard',
      fromScryfallId: 'forest',
      toScryfallId: 'forest',
      quantity: 1,
    },
  ],
  [
    'proxy no deck do grupo',
    r.deckCard.PATCH as Handler,
    'PATCH',
    () => ({ deckId: ids.groupDeck!, cardId: ids.groupDeckCard! }),
    { isProxy: true },
  ],
  ['sync do deck do grupo', r.sync.POST as Handler, 'POST', () => ({ deckId: ids.groupDeck! }), {}],
];

describe('matriz de autorização', () => {
  it.each(outsiderCases)(
    'quem não é do grupo: %s → negado, sem dados',
    async (_l, handler, method, params, body) => {
      asUser(otto);
      const res = await hit(handler, method, params(), typeof body === 'function' ? body() : body);
      expect([403, 404]).toContain(res.status);
      expect(res.text).not.toMatch(SECRET);
    },
  );

  it.each(memberCases)(
    'membro comum: %s → negado, sem dados',
    async (_l, handler, method, params, body) => {
      asUser(bia);
      const res = await hit(handler, method, params(), typeof body === 'function' ? body() : body);
      expect([403, 404]).toContain(res.status);
      expect(res.text).not.toMatch(SECRET);
    },
  );

  it('controle: a dona e o membro comum leem o que é deles', async () => {
    asUser(ana);
    expect((await hit(r.deck.GET as Handler, 'GET', { deckId: ids.privateDeck! })).status).toBe(
      200,
    );
    asUser(bia);
    expect((await hit(r.deck.GET as Handler, 'GET', { deckId: ids.groupDeck! })).status).toBe(200);
    expect((await hit(r.event.GET as Handler, 'GET', { eventId: ids.event! })).status).toBe(200);
    expect((await hit(r.members.GET as Handler, 'GET', { groupId: ids.group! })).status).toBe(200);
  });
});
