'use client';

import { selectedOption, type SelectProps } from '@boramarcar/ui';
import { useState } from 'react';
import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  Text,
} from 'react-aria-components';
import { Icon } from '../icons';

/** O React Aria não aceita chave vazia: o "Todos" (`''`) vira esta chave por dentro. */
const EMPTY_KEY = '__vazio__';
const toKey = (value: string) => (value === '' ? EMPTY_KEY : value);
const fromKey = (key: string) => (key === EMPTY_KEY ? '' : key);

type Props<T extends string> = Omit<SelectProps<T>, 'value' | 'onChange'> & {
  /** Controlado: `value` + `onChange`. Em formulário `GET` (página de servidor): `name` + `defaultValue`. */
  value?: SelectProps<T>['value'];
  onChange?: SelectProps<T>['onChange'];
  defaultValue?: NoInfer<T> | null;
  /** Envia o valor em formulários (campo oculto). */
  name?: string;
  id?: string;
  /** Rótulo só para leitor de tela (quando já há um título visível ao lado). */
  hideLabel?: boolean;
  className?: string;
};

/**
 * Lista de seleção do design system (React Aria): botão com o valor e uma lista em popover, com
 * teclado (setas, digitar para achar, Esc), nome e estado anunciados, nos dois temas. Para poucas
 * opções curtas, prefira `Choices`.
 */
export function Select<T extends string>({
  label,
  value,
  onChange,
  defaultValue = null,
  options,
  placeholder,
  description,
  error,
  disabled,
  name,
  id,
  hideLabel = false,
  className,
}: Props<T>) {
  const [inner, setInner] = useState<T | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const chosen = selectedOption(options, current);
  return (
    <AriaSelect
      id={id}
      selectedKey={chosen ? toKey(chosen.value) : null}
      onSelectionChange={(key) => {
        if (key === null) return;
        const next = fromKey(String(key)) as T;
        setInner(next);
        onChange?.(next);
      }}
      disabledKeys={options.filter((o) => o.disabled).map((o) => toKey(o.value))}
      placeholder={placeholder}
      isDisabled={disabled}
      isInvalid={Boolean(error)}
      className={className}
    >
      {/* `label` já traz o espaço até o campo; mesma altura e fonte do `input` e dos `btn*`. */}
      <Label className={hideLabel ? 'sr-only' : 'label'}>{label}</Label>
      <Button className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-line-strong bg-surface ps-3 pe-2 text-start text-sm text-fg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 data-[pressed]:bg-surface-muted [[data-invalid]_&]:border-danger">
        <SelectValue className="truncate data-[placeholder]:text-fg-muted" />
        <Icon name="chevronDown" />
      </Button>
      {name !== undefined && <input type="hidden" name={name} value={current ?? ''} />}
      {description && (
        <Text slot="description" className="muted mt-1 block text-sm">
          {description}
        </Text>
      )}
      <FieldError className="mt-1 block text-sm text-danger">{error}</FieldError>
      <Popover className="min-w-(--trigger-width) overflow-auto rounded-2xl border border-line bg-surface p-1 shadow-xl motion-safe:transition-opacity">
        <ListBox className="max-h-72 outline-none">
          {options.map((o) => (
            <ListBoxItem
              key={toKey(o.value)}
              id={toKey(o.value)}
              textValue={o.label}
              className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm text-fg outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[focused]:bg-surface-muted data-[selected]:font-semibold data-[focus-visible]:outline-2 data-[focus-visible]:outline-focus"
            >
              {({ isSelected }) => (
                <>
                  <span>{o.label}</span>
                  {isSelected && <Icon name="done" />}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
