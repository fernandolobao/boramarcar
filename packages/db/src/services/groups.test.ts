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
  listGroupsForUser,
  listLocations,
  listMembers,
  regenerateInviteCode,
  requireMembership,
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
