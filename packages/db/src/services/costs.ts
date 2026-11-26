import {
  COST_AMOUNT_MAX_CENTS,
  COST_MONTH_RE,
  COST_NOTE_MAX,
  costMonths,
  currentCostMonth,
  DomainError,
  monthlyCostCents,
  revenueTargetCents,
  shiftMonth,
  type CostCurrency,
  type CostEntry,
  type CostPeriod,
  type CostService,
} from '@boramarcar/core';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { costEntries } from '../schema';

/** Custos da plataforma (13.1): lançamentos e o resumo por mês para o `/admin`. */

export interface CostEntryInput {
  service: CostService;
  period: CostPeriod;
  month: string;
  currency: CostCurrency;
  amountCents: number;
  /** Reais por dólar; obrigatório em dólar. */
  usdRate: number | null;
  note: string | null;
  createdBy: string | null;
}

export async function addCostEntry(db: Database, input: CostEntryInput) {
  if (!COST_MONTH_RE.test(input.month)) {
    throw new DomainError('invalid_input', 'Mês inválido (use AAAA-MM)');
  }
  if (
    !Number.isInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    input.amountCents > COST_AMOUNT_MAX_CENTS
  ) {
    throw new DomainError('invalid_input', 'Valor inválido');
  }
  const usd = input.currency === 'USD';
  if (usd && !(input.usdRate && input.usdRate > 0 && input.usdRate < 100)) {
    throw new DomainError('invalid_input', 'Informe a cotação do dólar');
  }
  const note = input.note?.trim().slice(0, COST_NOTE_MAX) || null;
  const [row] = await db
    .insert(costEntries)
    .values({
      service: input.service,
      period: input.period,
      month: input.month,
      currency: input.currency,
      amountCents: input.amountCents,
      usdRate: usd ? input.usdRate : null,
      brlCents: usd ? Math.round(input.amountCents * input.usdRate!) : input.amountCents,
      note,
      createdBy: input.createdBy,
    })
    .returning();
  return row!;
}

export const listCostEntries = (db: Database) =>
  db
    .select()
    .from(costEntries)
    .orderBy(desc(costEntries.month), asc(costEntries.service), asc(costEntries.createdAt));

export async function deleteCostEntry(db: Database, id: string) {
  const [row] = await db
    .delete(costEntries)
    .where(eq(costEntries.id, id))
    .returning({ id: costEntries.id });
  if (!row) throw new DomainError('not_found', 'Lançamento não encontrado');
}

/**
 * Repete no mês os lançamentos mensais do mês anterior (assinaturas que se repetem). Não faz nada
 * se o mês já tiver lançamentos mensais. Devolve quantos copiou.
 */
export async function copyMonthlyCosts(
  db: Database,
  month: string,
  createdBy: string | null = null,
) {
  if (!COST_MONTH_RE.test(month)) throw new DomainError('invalid_input', 'Mês inválido');
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: costEntries.id })
      .from(costEntries)
      .where(and(eq(costEntries.month, month), eq(costEntries.period, 'month')))
      .limit(1);
    if (existing.length > 0) return 0;
    const previous = await tx
      .select()
      .from(costEntries)
      .where(and(eq(costEntries.month, shiftMonth(month, -1)), eq(costEntries.period, 'month')));
    if (previous.length === 0) return 0;
    await tx.insert(costEntries).values(
      previous.map((e) => ({
        service: e.service,
        period: e.period,
        month,
        currency: e.currency,
        amountCents: e.amountCents,
        usdRate: e.usdRate,
        brlCents: e.brlCents,
        note: e.note,
        createdBy,
      })),
    );
    return previous.length;
  });
}

/** Custo, receita e meta dos últimos `count` meses (o primeiro é o atual), e o mês atual por serviço. */
export async function getCostSummary(db: Database, now: Date, count = 6) {
  const rows = await listCostEntries(db);
  const entries: (CostEntry & { createdAt: Date })[] = rows.map((r) => ({
    service: r.service as CostService,
    period: r.period as CostPeriod,
    month: r.month,
    brlCents: r.brlCents,
    createdAt: r.createdAt,
  }));
  const current = currentCostMonth(now);
  // Receita: ainda não há pagamentos (13.4).
  const revenueCents = 0;
  const months = costMonths(current, count).map((month) => {
    const costCents = monthlyCostCents(entries, month);
    return { month, costCents, revenueCents, targetCents: revenueTargetCents(costCents) };
  });
  const byService = new Map<CostService, number>();
  for (const e of entries) {
    const share = monthlyCostCents([e], current);
    if (share > 0) byService.set(e.service, (byService.get(e.service) ?? 0) + share);
  }
  return {
    months,
    current: {
      ...months[0]!,
      byService: [...byService]
        .map(([service, costCents]) => ({ service, costCents }))
        .sort((a, b) => b.costCents - a.costCents),
    },
  };
}
