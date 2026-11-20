import { accountDeletionPreview, deleteUserAccount, getUserImage } from '@boramarcar/db';
import { z } from 'zod';
import { getAuth } from '@/server/auth';
import { authed, parseJson } from '@/server/http';
import { deleteUploadedImage } from '@/server/uploads';

/** O que muda nos grupos se a pessoa excluir a conta (para avisar antes de confirmar). */
export const GET = authed(async ({ db, user }) => ({
  deletion: await accountDeletionPreview(db, user.id),
}));

const schema = z.object({ confirm: z.literal(true) });

/**
 * Excluir minha conta (LGPD, art. 18, VI). Encerra a sessão (apaga os cookies) e apaga os
 * dados pessoais; as partidas ficam no histórico do grupo como "Jogador removido".
 */
export const DELETE = authed(async ({ req, db, user }) => {
  await parseJson(req, schema);
  let cleared: Headers | null = null;
  try {
    const signedOut = await getAuth().api.signOut({ headers: req.headers, returnHeaders: true });
    cleared = signedOut.headers;
  } catch {
    // Sem sessão por cookie (ex.: app com bearer): a exclusão apaga as sessões do mesmo jeito.
  }
  const image = await getUserImage(db, user.id);
  const result = await deleteUserAccount(db, user.id);
  // A foto enviada sai do armazenamento junto (LGPD).
  await deleteUploadedImage(image, { folder: 'avatars', ownerId: user.id });
  const response = Response.json({ deleted: true, ...result });
  for (const cookie of cleared?.getSetCookie() ?? []) response.headers.append('Set-Cookie', cookie);
  return response;
});
