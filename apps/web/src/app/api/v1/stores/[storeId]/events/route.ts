import { GAME_FORMATS } from '@boramarcar/core';
import { STORE_EVENT_KINDS } from '@boramarcar/core/stores';
import {
  createStoreEvent,
  getStoreBrief,
  listPushTargets,
  listStoreFollowerIds,
} from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { authed, parseJson } from '@/server/http';
import { buildStoreEventPush, deliverPush } from '@/server/push';

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  format: z.enum(GAME_FORMATS),
  kind: z.enum(STORE_EVENT_KINDS),
  capacity: z.number().int().min(1).max(512).nullable().optional(),
  prizes: z.string().max(2000).nullable().optional(),
  rules: z.string().max(2000).nullable().optional(),
});

/** Novo evento na agenda da loja (equipe da loja). */
export const POST = authed<{ storeId: string }>(
  async ({ req, db, user, params }) => {
    const event = await createStoreEvent(db, {
      ...(await parseJson(req, schema)),
      storeId: params.storeId,
      userId: user.id,
    });
    // Push para quem segue a loja (10.4); o sino já foi gravado junto com o evento.
    runAfterResponse(async () => {
      const [store, followers] = await Promise.all([
        getStoreBrief(db, params.storeId),
        listStoreFollowerIds(db, params.storeId),
      ]);
      if (!store || !followers.length) return;
      const targets = await listPushTargets(db, followers);
      await deliverPush(
        db,
        targets.map((target) =>
          buildStoreEventPush(target, {
            storeName: store.name,
            event: { id: event.id, title: event.title, startsAt: event.startsAt },
          }),
        ),
      );
    });
    return { event: { id: event.id } };
  },
  { status: 201 },
);
