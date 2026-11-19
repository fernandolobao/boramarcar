import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import {
  acceptStoreInvite,
  createStore,
  deleteStore,
  getStoreForManager,
  getStorePublic,
  inviteStoreMember,
  listMyStores,
  listStoresForAdmin,
  removeStoreMember,
  revokeStoreInvite,
  setStoreVerified,
  updateStore,
} from './stores';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('perfis de loja (10.1)', () => {
  it('admin cria a loja; o convite de dono só vale para o e-mail convidado, uma vez', async () => {
    const admin = await createTestUser(db, { name: 'Admin' });
    const dono = await createTestUser(db, { name: 'Dono', email: 'dono@loja.test' });
    const intruso = await createTestUser(db, { name: 'Intruso', email: 'outro@x.test' });
    const { store, invite } = await createStore(db, {
      name: 'Loja do Mago',
      city: 'Porto Alegre',
      email: 'Dono@Loja.test',
      createdBy: admin.id,
    });
    expect(store.slug).toBe('loja-do-mago');
    expect(invite).toMatchObject({ email: 'dono@loja.test', role: 'owner' });
    expect(invite.token.length).toBeGreaterThanOrEqual(32);
    // Mesmo nome: endereço diferente.
    const again = await createStore(db, {
      name: 'Loja do Mago',
      city: 'Canoas',
      email: 'b@loja.test',
      createdBy: admin.id,
    });
    expect(again.store.slug).toBe('loja-do-mago-2');

    await expect(
      acceptStoreInvite(db, { token: invite.token, userId: intruso.id, userEmail: intruso.email }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const accepted = await acceptStoreInvite(db, {
      token: invite.token,
      userId: dono.id,
      userEmail: dono.email,
    });
    expect(accepted).toMatchObject({ slug: 'loja-do-mago', role: 'owner' });
    await expect(
      acceptStoreInvite(db, { token: invite.token, userId: dono.id, userEmail: dono.email }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await expect(
      acceptStoreInvite(db, { token: 'nao-existe', userId: dono.id, userEmail: dono.email }),
    ).rejects.toMatchObject({ code: 'not_found' });

    expect((await listMyStores(db, { userId: dono.id })).map((s) => s.slug)).toEqual([
      'loja-do-mago',
    ]);
    const forAdmin = await listStoresForAdmin(db);
    expect(forAdmin.find((s) => s.id === store.id)).toMatchObject({
      contactEmail: 'dono@loja.test',
      members: 1,
      verified: false,
    });
  });

  it('dono e equipe editam o perfil (contatos limpos); só o dono cuida da equipe', async () => {
    const admin = await createTestUser(db);
    const dono = await createTestUser(db, { email: 'd2@loja.test' });
    const ajudante = await createTestUser(db, { name: 'Ajudante', email: 'aj@loja.test' });
    const estranho = await createTestUser(db);
    const { store, invite } = await createStore(db, {
      name: 'Cartas & Café',
      city: 'Curitiba',
      email: 'd2@loja.test',
      createdBy: admin.id,
    });
    await acceptStoreInvite(db, { token: invite.token, userId: dono.id, userEmail: dono.email });

    await updateStore(db, {
      storeId: store.id,
      userId: dono.id,
      about: 'Commander às sextas.',
      address: 'Rua XV, 100',
      lat: -25.43,
      lng: -49.27,
      hours: 'Ter a sáb, 14h às 22h',
      instagram: '@cartasecafe',
      whatsapp: '(41) 99999-0000',
      website: 'cartasecafe.com.br',
      formats: ['commander', 'modern'],
    });
    await expect(
      updateStore(db, { storeId: store.id, userId: dono.id, website: 'javascript:alert(1)' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      updateStore(db, { storeId: store.id, userId: estranho.id, about: 'x' }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const staffInvite = await inviteStoreMember(db, {
      storeId: store.id,
      userId: dono.id,
      email: 'aj@loja.test',
    });
    await acceptStoreInvite(db, {
      token: staffInvite.token,
      userId: ajudante.id,
      userEmail: ajudante.email,
    });
    // Equipe edita o perfil, mas não convida nem tira ninguém.
    await updateStore(db, { storeId: store.id, userId: ajudante.id, hours: 'Ter a dom' });
    await expect(
      inviteStoreMember(db, { storeId: store.id, userId: ajudante.id, email: 'z@z.test' }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const pub = await getStorePublic(db, { slug: 'cartas-cafe' });
    expect(pub).toMatchObject({
      name: 'Cartas & Café',
      instagram: 'cartasecafe',
      whatsapp: '5541999990000',
      website: 'https://cartasecafe.com.br/',
      hours: 'Ter a dom',
      formats: ['commander', 'modern'],
      verified: false,
    });
    // O e-mail de contato não aparece no perfil público.
    expect(JSON.stringify(pub)).not.toContain('d2@loja.test');

    const managed = await getStoreForManager(db, { slug: 'cartas-cafe', userId: dono.id });
    expect(managed.members.map((m) => [m.name, m.role])).toEqual(
      expect.arrayContaining([['Ajudante', 'staff']]),
    );
    await expect(
      getStoreForManager(db, { slug: 'cartas-cafe', userId: estranho.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    // Convite pendente pode ser cancelado.
    const pending = await inviteStoreMember(db, {
      storeId: store.id,
      userId: dono.id,
      email: 'novo@loja.test',
    });
    await revokeStoreInvite(db, { storeId: store.id, userId: dono.id, inviteId: pending.id });
    expect(
      (await getStoreForManager(db, { slug: 'cartas-cafe', userId: dono.id })).invites,
    ).toEqual([]);

    await removeStoreMember(db, { storeId: store.id, userId: dono.id, memberId: ajudante.id });
    // O último dono não sai.
    await expect(
      removeStoreMember(db, { storeId: store.id, userId: dono.id, memberId: dono.id }),
    ).rejects.toMatchObject({ code: 'conflict' });

    await setStoreVerified(db, { storeId: store.id, verified: true });
    expect((await getStorePublic(db, { slug: 'cartas-cafe' }))!.verified).toBe(true);
    await deleteStore(db, { storeId: store.id, userId: dono.id });
    expect(await getStorePublic(db, { slug: 'cartas-cafe' })).toBeNull();
  });

  it('convite vencido não vale', async () => {
    const admin = await createTestUser(db);
    const dono = await createTestUser(db, { email: 'velho@loja.test' });
    const { invite } = await createStore(db, {
      name: 'Loja Antiga',
      city: 'Recife',
      email: 'velho@loja.test',
      createdBy: admin.id,
      now: new Date('2026-01-01T12:00:00Z'),
    });
    await expect(
      acceptStoreInvite(db, {
        token: invite.token,
        userId: dono.id,
        userEmail: dono.email,
        now: new Date('2026-02-01T12:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
