import type { Database } from '../client';
import { createTestUser } from '../testing';
import { createGroup, joinGroup } from '../services/groups';

/** Cria um grupo com `size` jogadores (o primeiro é o dono). */
export async function seedGroup(db: Database, size = 4) {
  const players = [];
  for (let i = 0; i < size; i++) players.push(await createTestUser(db, { name: `P${i + 1}` }));
  const group = await createGroup(db, { name: 'Mesa de Quinta', userId: players[0]!.id });
  for (const player of players.slice(1))
    await joinGroup(db, { inviteCode: group.inviteCode, userId: player.id });
  return { group, players, owner: players[0]! };
}
