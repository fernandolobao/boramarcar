'use client';

import { stepTime, type TimeFieldProps } from '@boramarcar/ui';
import { parseTime, type Time } from '@internationalized/date';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  DateInput,
  DateSegment,
  FieldError,
  I18nProvider,
  Label,
  Text,
  TimeField as AriaTimeField,
} from 'react-aria-components';

const pad = (n: number) => String(n).padStart(2, '0');
const stepButton =
  'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-lg font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Campo de horário do design system (no lugar do `type="time"` nativo): hora e minuto digitáveis
 * (setas mudam cada parte) e −/+ de `step` minutos. Valor em texto 'HH:MM', 24 horas.
 */
export function TimeField({
  label,
  value,
  onChange,
  step = 30,
  description,
  error,
  disabled,
  labels,
  name,
  id,
  className,
}: Omit<TimeFieldProps, 'labels'> & {
  labels?: TimeFieldProps['labels'];
  name?: string;
  id?: string;
  className?: string;
}) {
  const t = useTranslations('ds');
  const locale = useLocale();
  const texts = labels ?? {
    decrease: t('timeDecrease', { label, step, value }),
    increase: t('timeIncrease', { label, step, value }),
  };
  return (
    <I18nProvider locale={locale}>
      <AriaTimeField
        id={id}
        name={name}
        value={value ? parseTime(value) : null}
        onChange={(v: Time | null) => v && onChange(`${pad(v.hour)}:${pad(v.minute)}`)}
        hourCycle={24}
        isDisabled={disabled}
        isInvalid={Boolean(error)}
        className={`space-y-1 ${className ?? ''}`}
      >
        <Label className="label">{label}</Label>
        <div className="flex items-center gap-2">
          <Button
            className={stepButton}
            aria-label={texts.decrease}
            isDisabled={disabled}
            onPress={() => onChange(stepTime(value, -step))}
          >
            −
          </Button>
          <DateInput className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line-strong bg-surface px-3 tabular-nums focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus data-[invalid]:border-danger">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="rounded px-0.5 outline-none focus:bg-primary focus:text-on-primary data-[placeholder]:text-fg-muted data-[type=literal]:px-0"
              />
            )}
          </DateInput>
          <Button
            className={stepButton}
            aria-label={texts.increase}
            isDisabled={disabled}
            onPress={() => onChange(stepTime(value, step))}
          >
            +
          </Button>
        </div>
        {description && (
          <Text slot="description" className="muted text-sm">
            {description}
          </Text>
        )}
        <FieldError className="text-sm text-danger">{error}</FieldError>
      </AriaTimeField>
    </I18nProvider>
  );
}
