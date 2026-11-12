import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import {
  claimBetaWelcomes,
  endBeta,
  getBeta,
  getBetaBanner,
  getBetaGroupStats,
  listGroupsForBeta,
  saveBeta,
} from './beta';
import { createGroup } from './groups';
import { markOnboarding } from './onboarding';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const DAY = 86_400_000;

describe('beta assistido', () => {
  it('rascunho → marcado → rodando, com faixa, boas-vindas uma vez e encerramento', async () => {
    const ana = await createTestUser(db, { name: 'Ana' });
    const bia = await createTestUser(db, { name: 'Bia' });
    const mesa = await createGroup(db, { name: 'Mesa da Ana', userId: ana.id });
    const outro = await createGroup(db, { name: 'Outro', userId: bia.id });

    expect((await getBeta(db)).state.phase).toBe('draft');

    const now = new Date();
    const later = new Date(now.getTime() + 3 * DAY);
    const saved = await saveBeta(db, { groupIds: [mesa.id, 'nao-existe'], startsAt: later });
    expect(saved.groupIds).toEqual([mesa.id]);
    expect(saved.state.phase).toBe('scheduled');
    // Antes do início: nada muda para o grupo.
    expect(await getBetaBanner(db, { groupId: mesa.id, userId: ana.id, now })).toBeNull();
    expect(await claimBetaWelcomes(db, now)).toEqual([]);

    const groups = await listGroupsForBeta(db);
    expect(groups[0]).toMatchObject({ id: mesa.id, inBeta: true, members: 1 });

    const start = new Date(now.getTime() - 9 * DAY);
    await saveBeta(db, { groupIds: [mesa.id], startsAt: start });
    expect(await getBetaBanner(db, { groupId: mesa.id, userId: ana.id, now })).toMatchObject({
      week: 2,
    });
    expect(await getBetaBanner(db, { groupId: outro.id, userId: bia.id, now })).toBeNull();

    expect(await claimBetaWelcomes(db, now)).toEqual([{ id: mesa.id, name: 'Mesa da Ana' }]);
    expect(await claimBetaWelcomes(db, now)).toEqual([]);

    const stats = await getBetaGroupStats(db, (await getBeta(db, now)).state, now);
    expect(stats).toEqual([
      expect.objectContaining({ id: mesa.id, members: 1, welcomed: true, games: 0 }),
    ]);

    await markOnboarding(db, { userId: ana.id, flag: 'beta-banner-dismissed' });
    expect(await getBetaBanner(db, { groupId: mesa.id, userId: ana.id, now })).toBeNull();

    expect((await endBeta(db, now)).state.phase).toBe('ended');
    // Tirar todos os grupos.
    expect((await saveBeta(db, { groupIds: [], startsAt: null })).groupIds).toEqual([]);
  });
});
