import { GAME_FORMATS, GAME_RESULTS } from '@boramarcar/core';
import { z } from 'zod';
import { isoDate } from './http';

/** Corpo comum de registrar e editar partida. */
export const gameSchema = z.object({
  format: z.enum(GAME_FORMATS).optional(),
  playedAt: isoDate.optional(),
  notes: z.string().trim().max(500).nullish(),
  firstPlayerId: z.string().nullish(),
  winningTurn: z.number().int().min(1).max(99).nullish(),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .nullish(),
  players: z
    .array(
      z.object({
        userId: z.string(),
        result: z.enum(GAME_RESULTS),
        deckId: z.string().nullish(),
        seat: z.number().int().min(1).max(8).nullish(),
        team: z.number().int().min(1).max(4).nullish(),
        eliminatedOrder: z.number().int().min(1).max(8).nullish(),
      }),
    )
    .min(2)
    .max(8),
});
