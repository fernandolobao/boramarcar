'use client';

import type { DateFieldProps } from '@boramarcar/ui';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  Text,
} from 'react-aria-components';
import { Icon } from '../icons';

const toCalendar = (value: string | null | undefined) => (value ? parseDate(value) : null);

const iconButton =
  'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Campo de data do design system (no lugar do `type="date"` nativo, que cada navegador desenha
 * do seu jeito): dia, mês e ano digitáveis (setas mudam cada parte) e um calendário no botão ao
 * lado. Valor em texto 'AAAA-MM-DD' (ou `null`); o fuso fica com quem envia.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  description,
  error,
  disabled,
  labels,
  name,
  id,
  className,
}: Omit<DateFieldProps, 'labels'> & {
  labels?: DateFieldProps['labels'];
  name?: string;
  id?: string;
  className?: string;
}) {
  const t = useTranslations('ds');
  const locale = useLocale();
  const texts = labels ?? {
    open: t('dateOpen', { label }),
    previousMonth: t('previousMonth'),
    nextMonth: t('nextMonth'),
  };
  return (
    // Idioma do site no React Aria: ordem dia/mês/ano, nomes dos meses e início da semana.
    <I18nProvider locale={locale}>
      <DatePicker
        id={id}
        name={name}
        value={toCalendar(value)}
        onChange={(v: CalendarDate | null) => onChange(v ? v.toString() : null)}
        minValue={toCalendar(min) ?? undefined}
        maxValue={toCalendar(max) ?? undefined}
        isDisabled={disabled}
        isInvalid={Boolean(error)}
        granularity="day"
        className={`space-y-1 ${className ?? ''}`}
      >
        <Label className="label">{label}</Label>
        <Group className="flex min-h-11 w-full items-center gap-1 rounded-xl border border-line-strong bg-surface ps-3 pe-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus data-[invalid]:border-danger">
          <DateInput className="flex flex-1 items-center tabular-nums">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="min-w-6 rounded px-0.5 text-center tabular-nums outline-none focus:bg-primary focus:text-on-primary data-[placeholder]:text-fg-muted data-[type=literal]:min-w-0 data-[type=literal]:px-0"
              />
            )}
          </DateInput>
          <Button className={iconButton} aria-label={texts.open}>
            <Icon name="events" />
          </Button>
        </Group>
        {description && (
          <Text slot="description" className="muted text-sm">
            {description}
          </Text>
        )}
        <FieldError className="text-sm text-danger">{error}</FieldError>
        <Popover className="rounded-2xl border border-line bg-surface p-3 shadow-xl motion-safe:transition-opacity">
          <Dialog className="outline-none">
            <Calendar className="space-y-2">
              <header className="flex items-center justify-between gap-2">
                <Button slot="previous" className={iconButton} aria-label={texts.previousMonth}>
                  <Icon name="previous" />
                </Button>
                <Heading className="font-semibold capitalize" />
                <Button slot="next" className={iconButton} aria-label={texts.nextMonth}>
                  <Icon name="next" />
                </Button>
              </header>
              <CalendarGrid className="border-separate border-spacing-1">
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-sm outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[outside-month]:hidden data-[selected]:bg-primary data-[selected]:text-on-primary"
                  />
                )}
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </DatePicker>
    </I18nProvider>
  );
}
