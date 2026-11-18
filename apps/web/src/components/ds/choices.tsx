'use client';

import type { ChoicesProps } from '@boramarcar/ui';
import type { ReactNode } from 'react';
import { FieldError, Label, Radio, RadioGroup, Text } from 'react-aria-components';

/**
 * Escolha única do design system (React Aria): `chips` em pílulas, `cards` em cartões com borda
 * (como os rádios de antes). Rádio de verdade por baixo: teclado com setas, nome e estado
 * anunciados, e `name` envia o valor em formulários.
 */
export function Choices<T extends string>({
  label,
  value,
  onChange,
  options,
  description,
  error,
  orientation = 'horizontal',
  name,
  variant = 'chips',
  hideLabel = false,
  icons,
  className,
}: ChoicesProps<T> & {
  /** Ícone decorativo antes do texto de cada opção (só no site; o texto continua sendo o nome). */
  icons?: Partial<Record<T, ReactNode>>;
  name?: string;
  variant?: 'chips' | 'cards';
  /** Rótulo só para leitor de tela (quando já há um título visível ao lado). */
  hideLabel?: boolean;
  className?: string;
}) {
  const chip =
    'inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium transition motion-reduce:transition-none hover:bg-surface-muted data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-on-primary data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';
  const card =
    'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 text-sm hover:bg-surface-muted data-[selected]:border-primary data-[selected]:bg-surface-muted data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';
  return (
    <RadioGroup
      // `null` = nenhuma escolhida: o React Aria pede `null` (e não `undefined`) para continuar controlado.
      value={value}
      onChange={(v) => onChange(v as T)}
      orientation={orientation}
      name={name}
      isInvalid={Boolean(error)}
      className={className}
    >
      <Label className={hideLabel ? 'sr-only' : 'label'}>{label}</Label>
      <div
        className={
          orientation === 'vertical' || variant === 'cards'
            ? // Três opções curtas (ex.: tema, visibilidade) cabem numa linha só.
              orientation !== 'vertical' &&
              options.length === 3 &&
              options.every((o) => !o.description)
              ? 'grid gap-2 sm:grid-cols-3'
              : 'grid gap-2 sm:grid-cols-2'
            : 'flex flex-wrap gap-2'
        }
      >
        {options.map((o) => (
          <Radio
            key={o.value}
            value={o.value}
            isDisabled={o.disabled}
            className={variant === 'cards' ? card : chip}
          >
            {({ isSelected }) => (
              <>
                {variant === 'cards' && (
                  <span
                    aria-hidden="true"
                    className={`size-4 shrink-0 rounded-full border-2 ${isSelected ? 'border-primary bg-primary ring-2 ring-inset ring-surface' : 'border-line-strong'}`}
                  />
                )}
                {icons?.[o.value]}
                <span>
                  {o.label}
                  {o.description && (
                    <span
                      className={variant === 'cards' ? 'muted block text-xs' : 'ms-1 opacity-80'}
                    >
                      {variant === 'cards' ? o.description : `· ${o.description}`}
                    </span>
                  )}
                </span>
              </>
            )}
          </Radio>
        ))}
      </div>
      {description && (
        <Text slot="description" className="muted mt-1 block text-sm">
          {description}
        </Text>
      )}
      <FieldError className="mt-1 block text-sm text-danger">{error}</FieldError>
    </RadioGroup>
  );
}
