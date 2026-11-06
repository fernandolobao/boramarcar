import { getPlayerProfile } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Perfil público para o grupo: resumo, conquistas e decks visíveis para quem pede. */
export const GET = authed<{ userId: string }>(async ({ db, user, params }) => ({
  player: await getPlayerProfile(db, { userId: params.userId, viewerId: user.id }),
}));
