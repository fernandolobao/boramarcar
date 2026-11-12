import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { createFeedback, feedbackPage, listRecentFeedback } from './feedback';
import { deleteUserAccount, exportUserData } from './privacy';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('feedback', () => {
  it('guarda só o caminho da página', () => {
    expect(feedbackPage('/decks/1?token=abc#x')).toBe('/decks/1');
    expect(feedbackPage('https://evil.com/x')).toBeNull();
    expect(feedbackPage('//evil.com')).toBeNull();
    expect(feedbackPage(null)).toBeNull();
  });

  it('salva, lista para o dono do projeto, exporta e some com a conta', async () => {
    const ana = await createTestUser(db, { name: 'Ana' });
    await expect(
      createFeedback(db, { userId: ana.id, kind: 'idea', message: ' a ', platform: 'web' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await createFeedback(db, {
      userId: ana.id,
      kind: 'problem',
      message: 'O botão de salvar não responde',
      page: '/eventos/1?x=1',
      platform: 'android',
    });
    const [item] = await listRecentFeedback(db);
    expect(item).toMatchObject({ kind: 'problem', page: '/eventos/1', name: 'Ana' });

    const data = await exportUserData(db, ana.id);
    expect(data.feedback).toEqual([
      expect.objectContaining({ message: 'O botão de salvar não responde' }),
    ]);
    await deleteUserAccount(db, ana.id);
    expect(await listRecentFeedback(db)).toEqual([]);
  });
});
