import {
  COST_AMOUNT_MAX_CENTS,
  COST_CURRENCIES,
  COST_MONTH_RE,
  COST_NOTE_MAX,
  COST_PERIODS,
  COST_SERVICES,
} from '@boramarcar/core';
import { addCostEntry, getCostSummary, listCostEntries } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { getUsdBrlRate } from '@/server/exchange-rate';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  service: z.enum(COST_SERVICES),
  period: z.enum(COST_PERIODS),
  month: z.string().regex(COST_MONTH_RE),
  currency: z.enum(COST_CURRENCIES),
  amountCents: z.number().int().positive().max(COST_AMOUNT_MAX_CENTS),
  /** Cotação da fatura; sem ela, em dólar, usa a PTAX do dia. */
  usdRate: z.number().positive().max(100).nullable().optional(),
  note: z.string().max(COST_NOTE_MAX).nullable().optional(),
});

/** Custos da plataforma (13.1): lançamentos, resumo dos meses e a cotação do dólar do dia. */
export const GET = authed(async ({ db, user }) => {
  assertAdmin(user.email);
  const [entries, summary, rate] = await Promise.all([
    listCostEntries(db),
    getCostSummary(db, new Date()),
    getUsdBrlRate({ db }),
  ]);
  return { entries, summary, usdRate: rate?.rate ?? null };
});

/** Novo lançamento. */
export const POST = authed(
  async ({ req, db, user }) => {
    assertAdmin(user.email);
    const input = await parseJson(req, schema);
    const usdRate =
      input.currency === 'USD'
        ? (input.usdRate ?? (await getUsdBrlRate({ db }))?.rate ?? null)
        : null;
    return {
      entry: await addCostEntry(db, {
        ...input,
        usdRate,
        note: input.note ?? null,
        createdBy: user.id,
      }),
    };
  },
  { status: 201 },
);
