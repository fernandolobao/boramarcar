import 'server-only';
import { redirect } from 'next/navigation';
import { getActiveGroup } from './active-group';
import { requireUser } from './current-user';

/** Para páginas que precisam de um grupo ativo; sem grupo, envia para /grupo. */
export async function requireUserAndGroup() {
  const user = await requireUser();
  const { active } = await getActiveGroup(user.id);
  if (!active) redirect('/grupo');
  return { user, group: active };
}
