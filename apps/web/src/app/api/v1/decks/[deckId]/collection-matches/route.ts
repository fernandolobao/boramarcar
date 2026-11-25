import { draftCollectionMatches } from '@boramarcar/db';
import { authed } from '@/server/http';

/**
 * Cartas do deck que o dono já tem livres na coleção, em qualquer edição (para o rascunho e a
 * janela de publicar). Só o dono.
 */
export const GET = authed<{ deckId: string }>(async ({ db, user, params }) => ({
  matches: await draftCollectionMatches(db, { deckId: params.deckId, userId: user.id }),
}));
