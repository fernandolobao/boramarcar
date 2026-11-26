import { createGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const scan = await import('../cards/scan/route');

let close: () => Promise<void>;
beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const scryCard = (extra: Record<string, unknown>) => ({
  id: 'sc-1',
  name: 'Thousand Moons Infantry',
  cmc: 3,
  type_line: 'Creature — Human Soldier',
  color_identity: ['W'],
  set: 'lci',
  set_name: 'The Lost Caverns of Ixalan',
  collector_number: '38',
  image_uris: { normal: 'https://cards.scryfall.io/normal/x.jpg' },
  ...extra,
});

const body = {
  text: '( Infantaria dos Mil Luas Ze ) |\nCriatura — Humano Soldado\nC 0038\nLCI • PT Manuel',
  lines: [
    { text: '( Infantaria dos Mil Luas Ze ) |', top: 0.05 },
    { text: 'Criatura — Humano Soldado', top: 0.55 },
  ],
  nameZone: 0.22,
};

describe('POST /api/v1/cards/scan (leitura pela câmera)', () => {
  it('sem a flag para o grupo: 404 (o recurso não existe para quem não está na lista)', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    await createGroup(testState.db!, { name: 'Outro grupo', userId: ana.id });
    vi.stubEnv('FLAG_CARD_SCANNER_GROUPS', 'Elfos de Boramarcar');
    asUser(ana);
    const res = await call(scan.POST, { method: 'POST', body });
    expect(res.status).toBe(404);
  });

  it('grupo na lista: acha a carta em português pela edição + número, conferindo o nome impresso', async () => {
    const bia = await createTestUser(testState.db!, { name: 'Bia' });
    await createGroup(testState.db!, { name: 'Elfos de Boramarcar', userId: bia.id });
    vi.stubEnv('FLAG_CARD_SCANNER_GROUPS', ' elfos de boramarcar , Outro');
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('/cards/lci/38/pt')
        ? Response.json(scryCard({ printed_name: 'Infantaria dos Mil Luas', lang: 'pt' }))
        : new Response('{}', { status: 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    asUser(bia);
    const res = await call(scan.POST, { method: 'POST', body });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      match: {
        how: 'set',
        printedName: 'Infantaria dos Mil Luas',
        card: { name: 'Thousand Moons Infantry', setCode: 'lci', collectorNumber: '38' },
      },
    });
    // Só o texto lido vai para o servidor; a busca usa a edição e o número.
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.scryfall.com/cards/lci/38/pt');
  });

  it('dados inválidos: 400', async () => {
    const caio = await createTestUser(testState.db!, { name: 'Caio' });
    await createGroup(testState.db!, { name: 'Elfos de Boramarcar', userId: caio.id });
    vi.stubEnv('FLAG_CARD_SCANNER_GROUPS', '*');
    asUser(caio);
    const res = await call(scan.POST, { method: 'POST', body: { ...body, nameZone: 5 } });
    expect(res.status).toBe(400);
  });
});
