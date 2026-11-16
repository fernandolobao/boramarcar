'use client';

import { useTranslations } from 'next-intl';
import { DateField } from './date-field';
import { TimeField } from './time-field';

export interface DateTimeValue {
  date: string | null;
  time: string;
}

/** Junta dia e horário no formato do antigo `datetime-local` ('AAAA-MM-DDTHH:MM'), ou '' sem dia. */
export const toLocalDateTime = (v: DateTimeValue) => (v.date ? `${v.date}T${v.time}` : '');
/** Separa um 'AAAA-MM-DDTHH:MM' em dia e horário. */
export const fromLocalDateTime = (value: string, fallbackTime = '19:00'): DateTimeValue =>
  value
    ? { date: value.slice(0, 10), time: value.slice(11, 16) }
    : { date: null, time: fallbackTime };

/**
 * Dia + horário do design system (no lugar do `datetime-local` nativo): um grupo com legenda e
 * os dois campos lado a lado. A conversão para UTC continua com quem envia (`zonedLocalToUtc`).
 */
export function DateTimeField({
  legend,
  value,
  onChange,
  min,
  max,
  error,
  disabled,
  className,
}: {
  legend: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  min?: string;
  max?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations('ds');
  return (
    <fieldset className={`min-w-0 ${className ?? ''}`}>
      <legend className="label">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          label={t('day')}
          value={value.date}
          onChange={(date) => onChange({ ...value, date })}
          min={min}
          max={max}
          error={error}
          disabled={disabled}
        />
        <TimeField
          label={t('time')}
          value={value.time}
          onChange={(time) => onChange({ ...value, time })}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}
