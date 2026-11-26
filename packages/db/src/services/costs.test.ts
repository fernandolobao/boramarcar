import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import {
  addCostEntry,
  copyMonthlyCosts,
  deleteCostEntry,
  getCostSummary,
  listCostEntries,
} from './costs';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const NOW = new Date('2026-11-26T12:00:00Z');

describe('custos mensais (13.1)', () => {
  it('lança em real e em dólar (convertido pela cotação guardada) e resume os meses', async () => {
    const admin = await createTestUser(db, { name: 'Admin' });
    await addCostEntry(db, {
      service: 'vercel',
      period: 'month',
      month: '2026-11',
      currency: 'USD',
      amountCents: 2_000,
      usdRate: 5.5,
      note: 'Pro',
      createdBy: admin.id,
    });
    await addCostEntry(db, {
      service: 'apple',
      period: 'year',
      month: '2026-10',
      currency: 'BRL',
      amountCents: 60_000,
      usdRate: null,
      note: null,
      createdBy: admin.id,
    });
    const entries = await listCostEntries(db);
    const vercel = entries.find((e) => e.service === 'vercel')!;
    expect(vercel.brlCents).toBe(11_000);
    expect(vercel.usdRate).toBe(5.5);

    const summary = await getCostSummary(db, NOW, 3);
    expect(summary.months.map((m) => m.month)).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(summary.months[0]).toMatchObject({ costCents: 11_000 + 5_000, revenueCents: 0 });
    expect(summary.months[1]).toMatchObject({ costCents: 5_000 });
    expect(summary.months[2]).toMatchObject({ costCents: 0 });
    // Meta: custo do mês atual + 15% sobre a receita.
    expect(summary.current.targetCents).toBe(Math.ceil(16_000 / 0.85));
    expect(summary.current.byService).toEqual([
      { service: 'vercel', costCents: 11_000 },
      { service: 'apple', costCents: 5_000 },
    ]);
  });

  it('dólar sem cotação é recusado; valor e mês inválidos também', async () => {
    const base = {
      service: 'neon' as const,
      period: 'month' as const,
      month: '2026-11',
      currency: 'USD' as const,
      amountCents: 1_900,
      usdRate: null,
      note: null,
      createdBy: null,
    };
    await expect(addCostEntry(db, base)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(addCostEntry(db, { ...base, usdRate: 5, amountCents: 0 })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(addCostEntry(db, { ...base, usdRate: 5, month: '2026-13' })).rejects.toMatchObject(
      { code: 'invalid_input' },
    );
  });

  it('copia os lançamentos mensais do mês anterior (uma vez só) e apaga um lançamento', async () => {
    const { db: own, close: closeOwn } = await createTestDb();
    try {
      const base = {
        period: 'month' as const,
        currency: 'BRL' as const,
        usdRate: null,
        note: null,
        createdBy: null,
      };
      await addCostEntry(own, {
        ...base,
        service: 'resend',
        month: '2026-10',
        amountCents: 10_000,
      });
      await addCostEntry(own, {
        ...base,
        service: 'domain',
        period: 'year',
        month: '2026-10',
        amountCents: 4_000,
      });
      expect(await copyMonthlyCosts(own, '2026-11')).toBe(1);
      // Já tem lançamentos mensais no mês: não duplica.
      expect(await copyMonthlyCosts(own, '2026-11')).toBe(0);
      const nov = (await listCostEntries(own)).filter((e) => e.month === '2026-11');
      expect(nov).toMatchObject([{ service: 'resend', brlCents: 10_000 }]);

      await deleteCostEntry(own, nov[0]!.id);
      expect((await listCostEntries(own)).some((e) => e.month === '2026-11')).toBe(false);
      await expect(deleteCostEntry(own, nov[0]!.id)).rejects.toMatchObject({ code: 'not_found' });
    } finally {
      await closeOwn();
    }
  });
});
