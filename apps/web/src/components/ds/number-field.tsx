'use client';

import { stepperLabel, type NumberFieldProps } from '@boramarcar/ui';
import { useTranslations } from 'next-intl';
import {
  Button,
  FieldError,
  Group,
  Input,
  Label,
  NumberField as AriaNumberField,
  Text,
} from 'react-aria-components';

/** Textos dos botões −/+ (com `{label}` e `{value}`), das mensagens do site. */
export function useDsLabels(): NumberFieldProps['labels'] {
  const t = useTranslations('ds');
  return { decrease: t.raw('decrease') as string, increase: t.raw('increase') as string };
}

const stepButton =
  'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-lg font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Campo numérico do design system: digitar ou usar −/+ (e as setas do teclado). Vazio = `null`;
 * fora do limite, o valor é ajustado ao sair do campo. Sem separador de milhar (ex.: 1440).
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  description,
  error,
  disabled,
  labels,
  id,
  name,
  className,
}: Omit<NumberFieldProps, 'labels'> & {
  labels?: NumberFieldProps['labels'];
  id?: string;
  name?: string;
  className?: string;
}) {
  const fallback = useDsLabels();
  const texts = labels ?? fallback;
  return (
    <AriaNumberField
      id={id}
      name={name}
      value={value ?? Number.NaN}
      onChange={(v) => onChange(Number.isNaN(v) ? null : v)}
      minValue={min}
      maxValue={max}
      step={step}
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
      className={className}
    >
      <Label className="label">{label}</Label>
      <Group className="flex items-center gap-2">
        <Button
          slot="decrement"
          // O texto já traz o rótulo do campo; sem isto o React Aria repetiria o rótulo no nome.
          aria-labelledby=""
          aria-label={stepperLabel(label, 'down', value, texts)}
          className={stepButton}
        >
          −
        </Button>
        {/* Classes do `input` sem a largura total (a classe `input` tem w-full e brigaria com w-20). */}
        <Input className="min-h-10 w-20 rounded-xl border border-line-strong bg-surface px-2 text-center text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]" />
        <Button
          slot="increment"
          aria-labelledby=""
          aria-label={stepperLabel(label, 'up', value, texts)}
          className={stepButton}
        >
          +
        </Button>
      </Group>
      {description && (
        <Text slot="description" className="muted mt-1 block text-sm">
          {description}
        </Text>
      )}
      <FieldError className="mt-1 block text-sm text-danger">{error}</FieldError>
    </AriaNumberField>
  );
}
