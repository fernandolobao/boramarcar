import { GAME_FORMATS } from '@boramarcar/core';
import { STORE_OFFERS } from '@boramarcar/core/discovery';
import { deleteStore, updateStore } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const optionalText = (max: number) => z.string().max(max).nullable().optional();
const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  municipalityCode: z
    .string()
    .regex(/^\d{7}$/)
    .optional(),
  offers: z.array(z.enum(STORE_OFFERS)).max(STORE_OFFERS.length).optional(),
  about: optionalText(2000),
  address: optionalText(200),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  hours: optionalText(300),
  instagram: optionalText(200),
  whatsapp: optionalText(40),
  website: optionalText(300),
  formats: z.array(z.enum(GAME_FORMATS)).max(GAME_FORMATS.length).optional(),
});

/** Edita o perfil da loja (dono ou equipe). */
export const PATCH = authed<{ storeId: string }>(async ({ req, db, user, params }) => {
  await updateStore(db, {
    ...(await parseJson(req, schema)),
    storeId: params.storeId,
    userId: user.id,
  });
  return { saved: true };
});

/** Exclui o perfil da loja (o dono). */
export const DELETE = authed<{ storeId: string }>(async ({ db, user, params }) => {
  await deleteStore(db, { storeId: params.storeId, userId: user.id });
  return { deleted: true };
});
