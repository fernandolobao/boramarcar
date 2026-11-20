import { requireStoreRole, setStoreLogo } from '@boramarcar/db';
import { authed } from '@/server/http';
import { rateLimit } from '@/server/limits';
import { deleteUploadedImage, fileFromRequest, saveUploadedImage } from '@/server/uploads';

/** Logo da loja (dono ou equipe; multipart, campo `file`). A permissão é conferida antes do envio. */
export const PUT = authed<{ storeId: string }>(async ({ req, db, user, params }) => {
  await requireStoreRole(db, params.storeId, user.id, ['owner', 'staff']);
  await rateLimit(db, user.id, 'upload');
  const url = await saveUploadedImage(await fileFromRequest(req), {
    folder: 'logos',
    ownerId: params.storeId,
  });
  await deleteUploadedImage(
    await setStoreLogo(db, { storeId: params.storeId, userId: user.id, url }),
    { folder: 'logos', ownerId: params.storeId },
  );
  return { logoUrl: url };
});

/** Tira o logo e apaga o arquivo. */
export const DELETE = authed<{ storeId: string }>(async ({ db, user, params }) => {
  await deleteUploadedImage(
    await setStoreLogo(db, { storeId: params.storeId, userId: user.id, url: null }),
    { folder: 'logos', ownerId: params.storeId },
  );
  return { logoUrl: null };
});
