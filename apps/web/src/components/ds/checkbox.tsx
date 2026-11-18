'use client';

import type { CheckboxProps } from '@boramarcar/ui';
import { useId, type ReactNode } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';
import { Icon } from '../icons';

/**
 * Caixa de marcar do design system (React Aria): caixa própria nos dois temas, rótulo clicável e
 * foco visível. `children` acrescenta detalhes depois do rótulo (marque como `aria-hidden` o que
 * for só visual); `className` estiliza a linha toda (ex.: um cartão com borda).
 */
export function Checkbox({
  label,
  checked,
  onChange,
  description,
  disabled,
  children,
  className,
  describedBy,
}: CheckboxProps & {
  children?: ReactNode;
  className?: string;
  /** Id de um texto que já existe na tela e descreve a caixa (ex.: a contagem de jogadores). */
  describedBy?: string;
}) {
  const hintId = useId();
  return (
    <div>
      <AriaCheckbox
        isSelected={checked}
        onChange={onChange}
        isDisabled={disabled}
        aria-describedby={
          [description ? hintId : null, describedBy].filter(Boolean).join(' ') || undefined
        }
        className={`group flex min-h-10 cursor-pointer items-center gap-2 text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 ${className ?? ''}`}
      >
        {({ isSelected }) => (
          <>
            <span
              aria-hidden="true"
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition motion-reduce:transition-none group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-focus ${
                isSelected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line-strong bg-surface'
              }`}
            >
              {isSelected && <Icon name="done" className="size-3.5" />}
            </span>
            <span>{label}</span>
            {children}
          </>
        )}
      </AriaCheckbox>
      {description && (
        <p id={hintId} className="muted -mt-1 ps-7 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
