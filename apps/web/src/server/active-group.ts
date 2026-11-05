import 'server-only';
import { listGroupsForUser } from '@boramarcar/db';
import { cookies } from 'next/headers';
import { getDb } from './db';

export const ACTIVE_GROUP_COOKIE = 'bm_group';

/** Grupo selecionado pelo usuário (cookie) ou o primeiro grupo dele. */
export async function getActiveGroup(userId: string) {
  const groups = await listGroupsForUser(getDb(), userId);
  const preferred = (await cookies()).get(ACTIVE_GROUP_COOKIE)?.value;
  const active = groups.find((g) => g.id === preferred) ?? groups[0] ?? null;
  return { active, groups };
}
