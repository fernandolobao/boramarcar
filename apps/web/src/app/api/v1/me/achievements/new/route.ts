import { listNewAchievements } from '@boramarcar/db';
import { authed } from '@/server/http';

/**
 * Conquistas que a pessoa ganhou e ainda não viu (janela do painel e do perfil). No primeiro
 * acesso, o que já estava conquistado conta como visto.
 */
export const GET = authed(async ({ db, user }) => ({
  achievements: await listNewAchievements(db, { userId: user.id }),
}));
