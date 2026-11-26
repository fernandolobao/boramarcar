'use client';

import {
  breakEven,
  COST_CURRENCIES,
  COST_NOTE_MAX,
  COST_PERIODS,
  COST_SERVICES,
  EXAMPLE_PRICES_CENTS,
  parseMoneyCents,
  REVENUE_OVERHEAD,
  shiftMonth,
  type CostCurrency,
  type CostPeriod,
  type CostService,
} from '@boramarcar/core';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Select } from '@/components/ds/select';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

export interface CostEntryRow {
  id: string;
  service: string;
  period: string;
  month: string;
  currency: string;
  amountCents: number;
  usdRate: number | null;
  brlCents: number;
  note: string | null;
}

export interface CostMonthRow {
  month: string;
  costCents: number;
  revenueCents: number;
  targetCents: number;
}

export interface CostSummaryData {
  months: CostMonthRow[];
  current: CostMonthRow & { byService: { service: string; costCents: number }[] };
}

/**
 * Custos da plataforma no `/admin` (13.1): o mês atual (custo, meta de receita e a conta de
 * padeiro), os últimos meses e os lançamentos, com o formulário para lançar (real ou dólar).
 */
export function CostsAdmin({
  summary,
  entries,
  usdRate,
}: {
  summary: CostSummaryData;
  entries: CostEntryRow[];
  usdRate: number | null;
}) {
  const t = useTranslations('admin.costs');
  const format = useFormatter();
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const current = summary.current;
  const [service, setService] = useState<CostService>('vercel');
  const [period, setPeriod] = useState<CostPeriod>('month');
  const [month, setMonth] = useState(current.month);
  const [currency, setCurrency] = useState<CostCurrency>('USD');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const brl = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'BRL' });
  const money = (cents: number, cur: string) =>
    format.number(cents / 100, { style: 'currency', currency: cur });
  const monthLabel = (m: string) =>
    format.dateTime(new Date(`${m}-15T12:00:00Z`), { month: 'long', year: 'numeric' });
  const serviceName = (s: string) => t(`services.${s as CostService}`);
  const even = breakEven(current.targetCents);

  const submit = () => {
    setStatus('');
    setLocalError(null);
    const amountCents = parseMoneyCents(amount);
    if (!amountCents) return setLocalError(t('invalidAmount'));
    let usd: number | null = null;
    if (currency === 'USD' && rate.trim()) {
      usd = Number(rate.trim().replace(',', '.'));
      if (!(usd > 0 && usd < 100)) return setLocalError(t('invalidRate'));
    }
    void run(
      () =>
        api('/api/v1/admin/costs', {
          method: 'POST',
          body: {
            service,
            period,
            month,
            currency,
            amountCents,
            usdRate: usd,
            note: note.trim() || null,
          },
        }),
      () => {
        setStatus(t('saved'));
        setAmount('');
        setRate('');
        setNote('');
        router.refresh();
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="muted text-sm">{t('costOf', { month: monthLabel(current.month) })}</p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {brl(current.costCents)}
          </p>
        </div>
        <div>
          <p className="muted text-sm">
            {t('target', { percent: Math.round(REVENUE_OVERHEAD * 100) })}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {brl(current.targetCents)}
          </p>
        </div>
        <div>
          <p className="muted text-sm">{t('revenue')}</p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {brl(current.revenueCents)}
          </p>
          <p className="muted text-sm">{t('revenueHint')}</p>
        </div>
      </div>
      {current.targetCents > 0 && (
        <p>
          {t('breakEven', {
            stores: even.stores,
            storePrice: brl(EXAMPLE_PRICES_CENTS.store),
            supporters: even.supporters,
            supporterPrice: brl(EXAMPLE_PRICES_CENTS.supporter),
          })}
        </p>
      )}

      {current.byService.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">
            {t('byService', { month: monthLabel(current.month) })}
          </h3>
          <ul className="divide-y divide-line text-sm">
            {current.byService.map((s) => (
              <li key={s.service} className="flex justify-between gap-2 py-1.5">
                <span>{serviceName(s.service)}</span>
                <span className="tabular-nums">{brl(s.costCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="mb-2 text-left font-semibold">{t('monthsCaption')}</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="py-2 pr-3">
                {t('cols.month')}
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                {t('cols.cost')}
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                {t('cols.target')}
              </th>
              <th scope="col" className="py-2 text-right">
                {t('cols.revenue')}
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.months.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {monthLabel(m.month)}
                </th>
                <td className="py-2 pr-3 text-right tabular-nums">{brl(m.costCents)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{brl(m.targetCents)}</td>
                <td className="py-2 text-right tabular-nums">{brl(m.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="space-y-3"
        aria-labelledby={`${id}-form`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3 id={`${id}-form`} className="font-semibold">
          {t('newTitle')}
        </h3>
        <p className="muted text-sm">{t('formHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t('service')}
            id={`${id}-service`}
            value={service}
            onChange={(v) => setService(v as CostService)}
            options={COST_SERVICES.map((s) => ({ value: s, label: serviceName(s) }))}
          />
          <div>
            <label className="label" htmlFor={`${id}-month`}>
              {t('month')}
            </label>
            <input
              id={`${id}-month`}
              type="month"
              className="input"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <Select
            label={t('period')}
            id={`${id}-period`}
            value={period}
            onChange={(v) => setPeriod(v as CostPeriod)}
            options={COST_PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`) }))}
          />
          <Select
            label={t('currency')}
            id={`${id}-currency`}
            value={currency}
            onChange={(v) => setCurrency(v as CostCurrency)}
            options={COST_CURRENCIES.map((c) => ({ value: c, label: t(`currencies.${c}`) }))}
          />
          <div>
            <label className="label" htmlFor={`${id}-amount`}>
              {t('amount', { currency: currency === 'USD' ? 'US$' : 'R$' })}
            </label>
            <input
              id={`${id}-amount`}
              className="input"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {currency === 'USD' && (
            <div>
              <label className="label" htmlFor={`${id}-rate`}>
                {t('rate')}
              </label>
              <input
                id={`${id}-rate`}
                className="input"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                aria-describedby={`${id}-rate-hint`}
              />
              <p id={`${id}-rate-hint`} className="muted mt-1 text-sm">
                {usdRate
                  ? t('rateHint', { rate: format.number(usdRate, { maximumFractionDigits: 4 }) })
                  : t('rateMissing')}
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`${id}-note`}>
              {t('note')}
            </label>
            <input
              id={`${id}-note`}
              className="input"
              maxLength={COST_NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending}>
            <Icon name="add" />
            {t('add')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              setStatus('');
              void run(
                () =>
                  api<{ copied: number }>('/api/v1/admin/costs/copy', {
                    method: 'POST',
                    body: { month },
                  }),
                (r) => {
                  setStatus(
                    t('copied', { count: r.copied, from: monthLabel(shiftMonth(month, -1)) }),
                  );
                  router.refresh();
                },
              );
            }}
          >
            <Icon name="copy" />
            {t('copy', { month: monthLabel(month) })}
          </button>
        </div>
      </form>
      <p role="status" className="muted text-sm">
        {status}
      </p>
      <FormError message={localError ?? error} />

      <div>
        <h3 className="mb-2 font-semibold">{t('entries')}</h3>
        {entries.length === 0 ? (
          <p className="muted">{t('noEntries')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) => {
              const label = `${serviceName(e.service)}, ${monthLabel(e.month)}`;
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {serviceName(e.service)}{' '}
                      <span className="muted font-normal">
                        · {monthLabel(e.month)} · {t(`periods.${e.period as CostPeriod}`)}
                      </span>
                    </p>
                    <p className="tabular-nums">
                      {e.currency === 'USD'
                        ? t('usdValue', {
                            usd: money(e.amountCents, 'USD'),
                            brl: brl(e.brlCents),
                            rate: format.number(e.usdRate ?? 0, { maximumFractionDigits: 4 }),
                          })
                        : brl(e.brlCents)}
                      {e.note && <span className="muted"> · {e.note}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={pending}
                    onBlur={() => setConfirm(null)}
                    onClick={() => {
                      if (confirm !== e.id) return setConfirm(e.id);
                      setConfirm(null);
                      void run(
                        () => api(`/api/v1/admin/costs/${e.id}`, { method: 'DELETE' }),
                        () => {
                          setStatus(t('deleted'));
                          router.refresh();
                        },
                      );
                    }}
                  >
                    <Icon name="delete" />
                    {confirm === e.id ? t('deleteConfirm') : t('delete')}
                    <span className="sr-only"> ({label})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
