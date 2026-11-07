import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import {
  createGroup,
  createLocation,
  generateInviteCode,
  getInvitePreview,
  isMember,
  joinGroup,
  leaveGroup,
  listGroupsForUser,
  listLocations,
  listMembers,
  regenerateInviteCode,
  removeMember,
  requireMembership,
  setMemberRole,
  transferOwnership,
} from './groups';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('grupos', () => {
  it('gera códigos de convite legíveis', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('cria grupo com o criador como dono e permite entrar por convite', async () => {
    const ana = await createTestUser(db, { name: 'Ana' });
    const bia = await createTestUser(db, { name: 'Bia' });
    const group = await createGroup(db, { name: '  Commander de Sexta ', userId: ana.id });
    expect(group.name).toBe('Commander de Sexta');

    await joinGroup(db, { inviteCode: group.inviteCode.toLowerCase(), userId: bia.id });
    // idempotente
    await joinGroup(db, { inviteCode: group.inviteCode, userId: bia.id });

    const members = await listMembers(db, group.id);
    expect(members.map((m) => [m.name, m.role])).toEqual([
      ['Ana', 'owner'],
      ['Bia', 'member'],
    ]);
    expect(await listGroupsForUser(db, bia.id)).toEqual([
      expect.objectContaining({ id: group.id, role: 'member' }),
    ]);
  });

  it('rejeita convite inválido e nome curto', async () => {
    const user = await createTestUser(db);
    await expect(joinGroup(db, { inviteCode: 'NAOEXISTE', userId: user.id })).rejects.toMatchObject(
      { code: 'not_found' },
    );
    await expect(createGroup(db, { name: 'x', userId: user.id })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });

  it('controla acesso de não membros', async () => {
    const owner = await createTestUser(db);
    const stranger = await createTestUser(db);
    const group = await createGroup(db, { name: 'Privado', userId: owner.id });
    await expect(requireMembership(db, group.id, stranger.id)).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(requireMembership(db, 'nao-existe', owner.id)).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(
      createLocation(db, { groupId: group.id, userId: stranger.id, name: 'Casa' }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('cadastra locais', async () => {
    const owner = await createTestUser(db);
    const group = await createGroup(db, { name: 'Com locais', userId: owner.id });
    await createLocation(db, {
      groupId: group.id,
      userId: owner.id,
      name: 'Loja do Zé',
      address: ' Rua 1 ',
    });
    await createLocation(db, {
      groupId: group.id,
      userId: owner.id,
      name: 'Casa da Ana',
      hostUserId: owner.id,
    });
    const list = await listLocations(db, group.id);
    expect(list.map((l) => [l.name, l.address])).toEqual([
      ['Casa da Ana', null],
      ['Loja do Zé', 'Rua 1'],
    ]);
  });

  it('mostra a prévia do convite e regenera o código', async () => {
    const owner = await createTestUser(db, { name: 'Dona' });
    const member = await createTestUser(db);
    const outsider = await createTestUser(db);
    const group = await createGroup(db, { name: 'Convites', userId: owner.id });
    await joinGroup(db, { inviteCode: group.inviteCode, userId: member.id });

    expect(await getInvitePreview(db, ` ${group.inviteCode.toLowerCase()} `)).toMatchObject({
      id: group.id,
      name: 'Convites',
      members: 2,
    });
    expect(await getInvitePreview(db, 'NAOEXISTE')).toBeNull();
    expect(await getInvitePreview(db, '  ')).toBeNull();
    expect(await isMember(db, group.id, member.id)).toBe(true);
    expect(await isMember(db, group.id, outsider.id)).toBe(false);

    await expect(
      regenerateInviteCode(db, { groupId: group.id, userId: member.id }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
    const updated = await regenerateInviteCode(db, { groupId: group.id, userId: owner.id });
    expect(updated.inviteCode).not.toBe(group.inviteCode);
    expect(await getInvitePreview(db, group.inviteCode)).toBeNull();
    await expect(
      joinGroup(db, { inviteCode: group.inviteCode, userId: outsider.id }),
    ).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('gestão de membros', () => {
  it('promove, rebaixa, remove, transfere e sai respeitando papéis', async () => {
    const [dona, adm, ana, bia] = await Promise.all(
      ['Dona', 'Adm', 'Ana', 'Bia'].map((name) => createTestUser(db, { name })),
    );
    const group = await createGroup(db, { name: 'Gestão', userId: dona!.id });
    for (const u of [adm!, ana!, bia!])
      await joinGroup(db, { inviteCode: group.inviteCode, userId: u.id });
    const role = async (id: string) =>
      (await listMembers(db, group.id)).find((m) => m.userId === id)?.role;

    // Membro comum não muda papéis; dono promove
    await expect(
      setMemberRole(db, {
        groupId: group.id,
        actorId: ana!.id,
        targetUserId: bia!.id,
        role: 'admin',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await setMemberRole(db, {
      groupId: group.id,
      actorId: dona!.id,
      targetUserId: adm!.id,
      role: 'admin',
    });
    expect(await role(adm!.id)).toBe('admin');

    // Admin promove membro, mas não rebaixa admin nem mexe no dono
    await setMemberRole(db, {
      groupId: group.id,
      actorId: adm!.id,
      targetUserId: ana!.id,
      role: 'admin',
    });
    await expect(
      setMemberRole(db, {
        groupId: group.id,
        actorId: adm!.id,
        targetUserId: ana!.id,
        role: 'member',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      setMemberRole(db, {
        groupId: group.id,
        actorId: adm!.id,
        targetUserId: dona!.id,
        role: 'member',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await setMemberRole(db, {
      groupId: group.id,
      actorId: dona!.id,
      targetUserId: ana!.id,
      role: 'member',
    });
    await expect(
      setMemberRole(db, {
        groupId: group.id,
        actorId: dona!.id,
        targetUserId: 'nope',
        role: 'admin',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });

    // Admin remove membro comum, não remove outro admin; dono remove qualquer um
    await expect(
      removeMember(db, { groupId: group.id, actorId: ana!.id, targetUserId: bia!.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await removeMember(db, { groupId: group.id, actorId: adm!.id, targetUserId: bia!.id });
    expect(await isMember(db, group.id, bia!.id)).toBe(false);

    // Dono não sai sem transferir; transfere e vira admin
    await expect(leaveGroup(db, { groupId: group.id, userId: dona!.id })).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(
      transferOwnership(db, { groupId: group.id, ownerId: adm!.id, newOwnerId: ana!.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      transferOwnership(db, { groupId: group.id, ownerId: dona!.id, newOwnerId: dona!.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await transferOwnership(db, { groupId: group.id, ownerId: dona!.id, newOwnerId: ana!.id });
    expect(await role(ana!.id)).toBe('owner');
    expect(await role(dona!.id)).toBe('admin');

    // Sair (inclusive via removeMember em si mesmo)
    expect(
      await removeMember(db, { groupId: group.id, actorId: dona!.id, targetUserId: dona!.id }),
    ).toEqual({ groupDeleted: false });
    expect(await leaveGroup(db, { groupId: group.id, userId: adm!.id })).toEqual({
      groupDeleted: false,
    });
    // Última pessoa (dona) sai: grupo apagado
    expect(await leaveGroup(db, { groupId: group.id, userId: ana!.id })).toEqual({
      groupDeleted: true,
    });
    await expect(requireMembership(db, group.id, ana!.id)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('locais do grupo (2.14)', () => {
  it('cria com coordenadas e anfitrião, edita e remove com permissões', async () => {
    const {
      createLocation,
      updateLocation,
      deleteLocation,
      listLocations,
      createGroup,
      joinGroup,
    } = await import('./groups');
    const owner = await createTestUser(db, { name: 'Dona' });
    const ana = await createTestUser(db, { name: 'Ana' });
    const bia = await createTestUser(db, { name: 'Bia' });
    const outsider = await createTestUser(db, { name: 'Fora' });
    const group = await createGroup(db, { name: 'Mesa', userId: owner.id });
    await joinGroup(db, { inviteCode: group.inviteCode, userId: ana.id });
    await joinGroup(db, { inviteCode: group.inviteCode, userId: bia.id });

    const casa = await createLocation(db, {
      groupId: group.id,
      userId: ana.id,
      name: ' Casa da Ana ',
      address: 'Avenida Ipiranga, 6681, Porto Alegre',
      details: ' apto 42 ',
      lat: -30.0551712,
      lng: -51.1735106,
      hostUserId: ana.id,
    });
    expect(casa).toMatchObject({ name: 'Casa da Ana', details: 'apto 42', createdBy: ana.id });
    await expect(
      createLocation(db, { groupId: group.id, userId: ana.id, name: 'X', lat: 120, lng: 0 }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createLocation(db, { groupId: group.id, userId: ana.id, name: 'X', hostUserId: outsider.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    const [listed] = await listLocations(db, group.id);
    expect(listed).toMatchObject({ hostName: 'Ana', lat: -30.0551712 });

    // Bia (membro comum, não cadastrou nem é anfitriã) não edita; a dona do grupo edita.
    await expect(
      updateLocation(db, { groupId: group.id, locationId: casa.id, userId: bia.id, name: 'Y' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const updated = await updateLocation(db, {
      groupId: group.id,
      locationId: casa.id,
      userId: owner.id,
      lat: null,
      lng: null,
      hostUserId: bia.id,
    });
    expect(updated).toMatchObject({ lat: null, lng: null, hostUserId: bia.id });
    await expect(
      updateLocation(db, { groupId: group.id, locationId: casa.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    // Agora a Bia é anfitriã: pode remover.
    await deleteLocation(db, { groupId: group.id, locationId: casa.id, userId: bia.id });
    expect(await listLocations(db, group.id)).toEqual([]);
    await expect(
      deleteLocation(db, { groupId: group.id, locationId: casa.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
