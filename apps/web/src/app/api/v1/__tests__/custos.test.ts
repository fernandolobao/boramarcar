import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);
// PTAX simulada (sem rede).
vi.mock('@/server/exchange-rate', () => ({
  getUsdBrlRate: async () => ({ rate: 5, date: '2026-11-26', source: 'ptax' }),
}));

const list = await import('../admin/costs/route');
const one = await import('../admin/costs/[entryId]/route');
const copy = await import('../admin/costs/copy/route');

let close: () => Promise<void>;
beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  delete process.env.ADMIN_EMAILS;
});

const month = new Date().toISOString().slice(0, 7);

describe('custos da plataforma (API de admin, 13.1)', () => {
  it('lança em dólar com a PTAX do dia ou com a cotação da fatura, resume e apaga', async () => {
    const admin = await createTestUser(testState.db!, { name: 'Admin' });
    process.env.ADMIN_EMAILS = admin.email;
    asUser(admin);

    const ptax = await call(list.POST, {
      method: 'POST',
      body: { service: 'vercel', period: 'month', month, currency: 'USD', amountCents: 2_000 },
    });
    expect(ptax.status).toBe(201);
    expect(ptax.body!.entry).toMatchObject({ usdRate: 5, brlCents: 10_000 });

    const invoice = await call(list.POST, {
      method: 'POST',
      body: {
        service: 'neon',
        period: 'month',
        month,
        currency: 'USD',
        amountCents: 1_000,
        usdRate: 5.8,
        note: 'Fatura com IOF',
      },
    });
    expect(invoice.body!.entry).toMatchObject({ brlCents: 5_800, note: 'Fatura com IOF' });

    const bad = await call(list.POST, {
      method: 'POST',
      body: { service: 'x', period: 'month', month, currency: 'BRL', amountCents: 1 },
    });
    expect(bad.status).toBe(400);

    const got = await call(list.GET);
    expect(got.body).toMatchObject({ usdRate: 5 });
    expect(got.body!.summary.current).toMatchObject({ month, costCents: 15_800, revenueCents: 0 });

    // O mês já tem lançamentos mensais: copiar não duplica.
    expect((await call(copy.POST, { method: 'POST', body: { month } })).body).toEqual({
      copied: 0,
    });

    const del = await call(one.DELETE, {
      method: 'DELETE',
      params: { entryId: invoice.body!.entry.id as string },
    });
    expect(del.status).toBeLessThan(300);
    expect((await call(list.GET)).body!.summary.current.costCents).toBe(10_000);
  });
});
