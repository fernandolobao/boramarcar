import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from './announcements';
import { listNotifications } from './inbox';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('avisos do ArcanaKin', () => {
  it('rascunho → edita → publica para todos: cada pessoa recebe a notificação com o texto', async () => {
    const admin = await createTestUser(db, { name: 'Admin' });
    const { players } = await seedGroup(db, 2);
    const draft = await createAnnouncement(db, {
      title: 'Manutenção',
      body: 'Sábado de manhã\no site fica fora por 10 minutos.',
      groupId: null,
      createdBy: admin.id,
    });
    expect(draft.status).toBe('draft');
    // Rascunho não chega a ninguém.
    expect(await listNotifications(db, { userId: players[0]!.id })).toEqual([]);

    await updateAnnouncement(db, { id: draft.id, title: 'Manutenção rápida' });
    const published = await publishAnnouncement(db, { id: draft.id });
    expect(published.status).toBe('published');
    for (const p of [...players, admin]) {
      const [n] = await listNotifications(db, { userId: p.id });
      expect(n).toMatchObject({
        kind: 'announcement',
        announcement: {
          title: 'Manutenção rápida',
          body: 'Sábado de manhã\no site fica fora por 10 minutos.',
        },
      });
    }
    // Publicado não muda nem publica de novo.
    await expect(publishAnnouncement(db, { id: draft.id })).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(updateAnnouncement(db, { id: draft.id, title: 'x' })).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(deleteAnnouncement(db, { id: draft.id })).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('aviso para um grupo só chega aos membros dele; rascunho pode ser excluído', async () => {
    const one = await seedGroup(db, 2);
    const other = await seedGroup(db, 1);
    const draft = await createAnnouncement(db, {
      title: 'Para a Mesa',
      body: 'Oi!',
      groupId: one.group.id,
      createdBy: one.owner.id,
    });
    await publishAnnouncement(db, { id: draft.id });
    expect(await listNotifications(db, { userId: one.players[1]!.id })).toHaveLength(1);
    expect(await listNotifications(db, { userId: other.owner.id })).toEqual([]);

    const extra = await createAnnouncement(db, {
      title: 'Apagar',
      body: '…',
      groupId: null,
      createdBy: one.owner.id,
    });
    await deleteAnnouncement(db, { id: extra.id });
    const list = await listAnnouncements(db);
    expect(list.some((a) => a.id === extra.id)).toBe(false);
    expect(list.find((a) => a.id === draft.id)).toMatchObject({ groupName: 'Mesa de Quinta' });
  });
});
