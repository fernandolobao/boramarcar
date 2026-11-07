import { z } from 'zod';

/** Campos de um local do grupo (criar e editar). */
export const locationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).nullish(),
  details: z.string().trim().max(300).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  hostUserId: z.string().nullish(),
});
