import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import {
  createAnnouncement,
  createChangelogDraft,
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

describe('novidades da semana', () => {
  it('rascunho com as novidades desde o último; sem novidades, nada', async () => {
    const entries = [
      { date: '2026-12-01', pt: 'Novidade de dezembro A.', en: 'December news A.' },
      { date: '2026-12-03', pt: 'Novidade de dezembro B.', en: 'December news B.' },
      { date: '2026-12-09', pt: 'Novidade da outra semana.', en: 'Next week news.' },
    ];
    // Segunda, 7/12 (10h em São Paulo): pega as dos últimos 7 dias.
    const first = await createChangelogDraft(db, {
      entries,
      now: new Date('2026-12-07T13:00:00Z'),
    });
    expect(first).toMatchObject({
      kind: 'changelog',
      status: 'draft',
      title: 'Novidades da semana',
      body: '• Novidade de dezembro A.\n• Novidade de dezembro B.',
    });
    // Mesmo dia de novo: nada novo.
    expect(
      await createChangelogDraft(db, { entries, now: new Date('2026-12-07T15:00:00Z') }),
    ).toBeNull();
    // Semana seguinte: só a nova.
    const second = await createChangelogDraft(db, {
      entries,
      now: new Date('2026-12-14T13:00:00Z'),
    });
    expect(second!.body).toBe('• Novidade da outra semana.');
    // Rascunho de novidades aparece no /admin como os outros.
    expect((await listAnnouncements(db)).some((a) => a.id === second!.id)).toBe(true);
  });

  it('clique duplo em "Publicar": as pessoas recebem uma vez, e o outro pedido é conflito', async () => {
    const admin = await createTestUser(db, { name: 'Admin 2' });
    const { players, group } = await seedGroup(db, 3);
    const draft = await createAnnouncement(db, {
      title: 'Aviso do grupo',
      body: 'Texto',
      groupId: group.id,
      createdBy: admin.id,
    });
    const settled = await Promise.allSettled([
      publishAnnouncement(db, { id: draft.id }),
      publishAnnouncement(db, { id: draft.id }),
    ]);
    expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (settled.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ code: 'conflict' });
    const inbox = await listNotifications(db, { userId: players[0]!.id });
    expect(inbox.filter((n) => n.kind === 'announcement')).toHaveLength(1);
  });
});
