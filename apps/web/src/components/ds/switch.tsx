'use client';

import type { SwitchProps } from '@boramarcar/ui';
import { useId } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';

/**
 * Interruptor do design system (React Aria): para configurações com efeito imediato. Para algo que
 * só vale ao salvar um formulário, use `Checkbox`.
 */
export function Switch({ label, checked, onChange, description, disabled }: SwitchProps) {
  const hintId = useId();
  return (
    <div>
      <AriaSwitch
        isSelected={checked}
        onChange={onChange}
        isDisabled={disabled}
        aria-describedby={description ? hintId : undefined}
        className="group flex min-h-10 cursor-pointer items-center justify-between gap-3 font-medium data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60"
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-line-strong bg-surface-muted px-0.5 transition motion-reduce:transition-none group-data-[selected]:border-primary group-data-[selected]:bg-primary group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-focus"
        >
          <span className="size-5 rounded-full bg-fg-muted shadow transition motion-reduce:transition-none group-data-[selected]:translate-x-5 group-data-[selected]:bg-on-primary" />
        </span>
      </AriaSwitch>
      {description && (
        <p id={hintId} className="muted -mt-1 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
