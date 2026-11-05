import 'server-only';
import { getAuth } from './auth';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/** Retorna o usuário autenticado a partir dos headers da requisição (cookie ou bearer). */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image };
}
