import { getStoreBrief, listPushTargets, listStoreNotices, postStoreNotice } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { authed, parseJson } from '@/server/http';
import { buildStoreNoticePush, deliverPush } from '@/server/push';

const schema = z.object({ text: z.string().max(400) });

/** Últimos avisos da loja (equipe). */
export const GET = authed<{ storeId: string }>(async ({ db, user, params }) => ({
  notices: await listStoreNotices(db, { storeId: params.storeId, userId: user.id }),
}));

/** Aviso da equipe para quem segue a loja (10.4): sino e push; até 3 por semana. */
export const POST = authed<{ storeId: string }>(
  async ({ req, db, user, params }) => {
    const { text } = await parseJson(req, schema);
    const { notice, followers } = await postStoreNotice(db, {
      storeId: params.storeId,
      userId: user.id,
      text,
    });
    runAfterResponse(async () => {
      const store = await getStoreBrief(db, params.storeId);
      if (!store) return;
      const targets = await listPushTargets(db, followers);
      await deliverPush(
        db,
        targets.map((target) =>
          buildStoreNoticePush(target, {
            storeName: store.name,
            slug: store.slug,
            text: notice.text,
          }),
        ),
      );
    });
    return { notice: { id: notice.id }, notified: followers.length };
  },
  { status: 201 },
);
