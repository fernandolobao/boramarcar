/**
 * Custos mensais do ArcanaKin (13.1): quanto custa manter a plataforma e quanto precisa entrar
 * para cobrir. Os valores são lançados no `/admin` em reais (ou dólar, convertido no lançamento).
 */

export const COST_SERVICES = [
  'vercel',
  'neon',
  'resend',
  'blob',
  'sentry',
  'domain',
  'apple',
  'google',
  'other',
] as const;
export type CostService = (typeof COST_SERVICES)[number];

/** `month`: só no mês; `year` e `once`: divididos por 12, do mês do pagamento aos 11 seguintes. */
export const COST_PERIODS = ['month', 'year', 'once'] as const;
export type CostPeriod = (typeof COST_PERIODS)[number];

export const COST_CURRENCIES = ['BRL', 'USD'] as const;
export type CostCurrency = (typeof COST_CURRENCIES)[number];

export const COST_NOTE_MAX = 200;
/** Teto de um lançamento (R$ 100 mil ou US$ 100 mil), para pegar erro de digitação. */
export const COST_AMOUNT_MAX_CENTS = 10_000_000;

/** Impostos e taxas estimados sobre a receita (Simples Nacional + taxa do meio de pagamento). */
export const REVENUE_OVERHEAD = 0.15;

/** Preços de exemplo do roadmap (13.2 e 13.3), só para a conta de padeiro. */
export const EXAMPLE_PRICES_CENTS = { store: 7_900, supporter: 990 } as const;

/** Mês no formato "AAAA-MM". */
export type CostMonth = string;
export const COST_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface CostEntry {
  service: CostService;
  period: CostPeriod;
  month: CostMonth;
  /** Valor em reais (centavos), já convertido. */
  brlCents: number;
}

const monthIndex = (m: CostMonth) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

export function shiftMonth(m: CostMonth, delta: number): CostMonth {
  const i = monthIndex(m) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Os `count` meses terminando em `last`, do mais recente para trás. */
export const costMonths = (last: CostMonth, count: number) =>
  Array.from({ length: count }, (_, i) => shiftMonth(last, -i));

/** Mês atual (UTC) no formato "AAAA-MM". */
export const currentCostMonth = (now: Date) => now.toISOString().slice(0, 7);

/** Parte de um lançamento que cai no mês (centavos inteiros; o resto vai para os primeiros meses). */
function shareInMonth(e: CostEntry, month: CostMonth) {
  const offset = monthIndex(month) - monthIndex(e.month);
  if (e.period === 'month') return offset === 0 ? e.brlCents : 0;
  if (offset < 0 || offset > 11) return 0;
  const base = Math.floor(e.brlCents / 12);
  return base + (offset < e.brlCents % 12 ? 1 : 0);
}

export const monthlyCostCents = (entries: CostEntry[], month: CostMonth) =>
  entries.reduce((sum, e) => sum + shareInMonth(e, month), 0);

/** Receita que, tirados os impostos e taxas, cobre o custo. */
export const revenueTargetCents = (costCents: number, overhead = REVENUE_OVERHEAD) =>
  costCents <= 0 ? 0 : Math.ceil(costCents / (1 - overhead));

/** Quantas lojas no plano ou quantos apoiadores pagam a meta (cada um sozinho). */
export function breakEven(
  targetCents: number,
  prices: { store: number; supporter: number } = EXAMPLE_PRICES_CENTS,
) {
  return {
    stores: Math.ceil(targetCents / prices.store),
    supporters: Math.ceil(targetCents / prices.supporter),
  };
}

/**
 * Valor digitado ("110,50", "1.234,56", "1234.56", "20") em centavos. O último separador seguido de
 * 1 ou 2 dígitos é o decimal; os outros são de milhar. `null` se não for um valor positivo.
 */
export function parseMoneyCents(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const match = /^(.*)[.,](\d{1,2})$/.exec(text);
  const whole = (match ? match[1]! : text).replace(/[.,]/g, '');
  const cents = match ? Number(match[2]!.padEnd(2, '0')) : 0;
  if (!/^\d+$/.test(whole)) return null;
  const value = Number(whole) * 100 + cents;
  return value > 0 ? value : null;
}
