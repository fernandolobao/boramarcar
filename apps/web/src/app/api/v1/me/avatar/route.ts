import { setUserImage } from '@boramarcar/db';
import { getAuth } from '@/server/auth';
import { authed } from '@/server/http';
import { rateLimit } from '@/server/limits';
import { deleteUploadedImage, fileFromRequest, saveUploadedImage } from '@/server/uploads';

/**
 * A sessão do site fica num cookie por alguns minutos (com a foto dentro). Depois da troca, relê a
 * sessão sem esse cache, para o menu do topo já mostrar a foto nova. Sem cookie (app), não faz nada.
 */
async function withFreshSession(req: Request, body: unknown) {
  const response = Response.json(body);
  try {
    const { headers } = await getAuth().api.getSession({
      headers: req.headers,
      query: { disableCookieCache: true },
      returnHeaders: true,
    });
    for (const cookie of headers.getSetCookie()) response.headers.append('Set-Cookie', cookie);
  } catch {
    // Sem sessão por cookie: nada a atualizar.
  }
  return response;
}

/**
 * Foto do perfil enviada pela pessoa (multipart, campo `file`: JPEG, PNG ou WebP até 4 MB). O
 * servidor recorta em quadrado, converte para WebP e tira os metadados (inclusive o GPS).
 */
export const PUT = authed(async ({ req, db, user }) => {
  await rateLimit(db, user.id, 'upload');
  const image = await saveUploadedImage(await fileFromRequest(req), {
    folder: 'avatars',
    ownerId: user.id,
  });
  await deleteUploadedImage(await setUserImage(db, { userId: user.id, image }), {
    folder: 'avatars',
    ownerId: user.id,
  });
  return withFreshSession(req, { image });
});

/** Tira a foto (volta às iniciais) e apaga o arquivo. */
export const DELETE = authed(async ({ req, db, user }) => {
  await deleteUploadedImage(await setUserImage(db, { userId: user.id, image: null }), {
    folder: 'avatars',
    ownerId: user.id,
  });
  return withFreshSession(req, { image: null });
});
