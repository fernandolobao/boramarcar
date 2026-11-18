import { getPlayerProfile } from '@boramarcar/db';
import { isAdmin } from '@/server/admin';
import { authed } from '@/server/http';

/**
 * Perfil público para o grupo: resumo, conquistas e decks visíveis para quem pede. Admins da
 * plataforma veem o perfil de qualquer pessoa (os decks seguem a visibilidade de sempre).
 */
export const GET = authed<{ userId: string }>(async ({ db, user, params }) => ({
  player: await getPlayerProfile(db, {
    userId: params.userId,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  }),
}));
