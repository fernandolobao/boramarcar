import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from './session';

/** Para Server Components: retorna o usuário ou redireciona para a página inicial. */
export async function requireUser() {
  const user = await getSessionUser(await headers());
  if (!user) redirect('/');
  return user;
}
