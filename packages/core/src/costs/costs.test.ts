import { describe, expect, it } from 'vitest';
import {
  breakEven,
  costMonths,
  monthlyCostCents,
  revenueTargetCents,
  shiftMonth,
  type CostEntry,
} from './index';

const entry = (e: Partial<CostEntry> & Pick<CostEntry, 'month' | 'brlCents'>): CostEntry => ({
  service: 'vercel',
  period: 'month',
  ...e,
});

describe('custos mensais (13.1)', () => {
  it('mês: só conta no próprio mês', () => {
    const entries = [entry({ month: '2026-11', brlCents: 11_000 })];
    expect(monthlyCostCents(entries, '2026-11')).toBe(11_000);
    expect(monthlyCostCents(entries, '2026-12')).toBe(0);
    expect(monthlyCostCents(entries, '2026-10')).toBe(0);
  });

  it('ano e pagamento único: divididos por 12, do mês do pagamento aos 11 seguintes', () => {
    const entries = [
      entry({ service: 'apple', period: 'year', month: '2026-11', brlCents: 60_000 }),
      entry({ service: 'google', period: 'once', month: '2026-12', brlCents: 13_200 }),
    ];
    expect(monthlyCostCents(entries, '2026-10')).toBe(0);
    expect(monthlyCostCents(entries, '2026-11')).toBe(5_000);
    expect(monthlyCostCents(entries, '2026-12')).toBe(5_000 + 1_100);
    expect(monthlyCostCents(entries, '2027-10')).toBe(5_000 + 1_100);
    // O 13º mês já não tem a anuidade (precisa lançar a renovação).
    expect(monthlyCostCents(entries, '2027-11')).toBe(1_100);
    expect(monthlyCostCents(entries, '2027-12')).toBe(0);
  });

  it('soma os centavos sem perder nos arredondamentos da divisão', () => {
    const entries = [entry({ period: 'year', month: '2026-01', brlCents: 100 })];
    const total = Array.from({ length: 12 }, (_, i) =>
      monthlyCostCents(entries, shiftMonth('2026-01', i)),
    ).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('meta de receita cobre o custo mais impostos e taxas (sobre a receita)', () => {
    // Com 15% de impostos e taxas, a receita R precisa de R × 0,85 ≥ custo.
    expect(revenueTargetCents(60_000, 0.15)).toBe(70_589);
    expect(revenueTargetCents(0, 0.15)).toBe(0);
  });

  it('conta de padeiro: quantas lojas ou apoiadores pagam a meta', () => {
    expect(breakEven(70_589, { store: 7_900, supporter: 990 })).toEqual({
      stores: 9,
      supporters: 72,
    });
    expect(breakEven(0, { store: 7_900, supporter: 990 })).toEqual({ stores: 0, supporters: 0 });
  });

  it('meses: do mais recente para trás, virando o ano', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(costMonths('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });
});

describe('valor digitado em centavos', () => {
  it('aceita vírgula ou ponto decimal e separador de milhar', async () => {
    const { parseMoneyCents } = await import('./index');
    expect(parseMoneyCents('110,50')).toBe(11_050);
    expect(parseMoneyCents('1.234,56')).toBe(123_456);
    expect(parseMoneyCents('1234.56')).toBe(123_456);
    expect(parseMoneyCents(' 20 ')).toBe(2_000);
    expect(parseMoneyCents('1,234.5')).toBe(123_450);
    expect(parseMoneyCents('')).toBeNull();
    expect(parseMoneyCents('abc')).toBeNull();
    expect(parseMoneyCents('-5')).toBeNull();
  });
});
