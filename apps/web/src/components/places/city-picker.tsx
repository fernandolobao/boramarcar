'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface CityOption {
  code: string;
  name: string;
  uf: string;
  slug: string;
}

const labelOf = (c: CityOption) => `${c.name}, ${c.uf}`;

/**
 * Cidade (município do IBGE) com autocompletar (padrão ARIA "combobox" com lista), pela tabela
 * de municípios do próprio ArcanaKin (sem serviço externo). Vale só a cidade escolhida da lista.
 */
export function CityPicker({
  label,
  value,
  onChange,
  required,
  id: givenId,
  action,
}: {
  label: string;
  /** Botão ao lado do campo (ex.: "Usar minha localização"), alinhado a ele; a dica fica abaixo dos dois. */
  action?: ReactNode;
  value: CityOption | null;
  onChange: (city: CityOption) => void;
  required?: boolean;
  id?: string;
}) {
  const t = useTranslations('discovery');
  const autoId = useId();
  const id = givenId ?? autoId;
  const listId = `${id}-lista`;
  const [text, setText] = useState(value ? labelOf(value) : '');
  const [options, setOptions] = useState<CityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) setText(value ? labelOf(value) : '');
  }, [value]);

  useEffect(() => {
    const q = text.trim();
    if (!typed.current || q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { municipalities } = await api<{ municipalities: CityOption[] }>(
          `/api/v1/municipalities?q=${encodeURIComponent(q)}`,
        );
        if (!cancelled) {
          setOptions(municipalities);
          setActive(-1);
        }
      } catch {
        if (!cancelled) setOptions([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  const visible = open && text.trim().length >= 2 && options.length > 0;
  const choose = (c: CityOption) => {
    typed.current = false;
    setText(labelOf(c));
    onChange(c);
    setOpen(false);
    setOptions([]);
    setActive(-1);
  };

  return (
    <div className="relative">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <input
            id={id}
            className="input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={visible}
            aria-controls={listId}
            aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
            aria-describedby={`${listId}-dica`}
            autoComplete="address-level2"
            required={required}
            maxLength={80}
            value={text}
            onChange={(e) => {
              typed.current = true;
              setText(e.target.value);
              setOpen(true);
            }}
            onBlur={() => {
              setOpen(false);
              // Sem escolher da lista, volta para a cidade que valia.
              if (typed.current) {
                typed.current = false;
                setText(value ? labelOf(value) : '');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setActive((i) => (options.length ? (i + 1) % options.length : -1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
              } else if (e.key === 'Enter' && visible && active >= 0) {
                e.preventDefault();
                choose(options[active]!);
              } else if (e.key === 'Escape' && visible) {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            hidden={!visible}
            className="absolute z-[1000] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line-strong bg-surface p-1 shadow-xl"
          >
            {options.map((c, i) => (
              <div
                key={c.code}
                id={`${listId}-${i}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-surface-muted aria-selected:bg-surface-muted aria-selected:font-semibold"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
              >
                {labelOf(c)}
              </div>
            ))}
          </div>
        </div>
        {action}
      </div>
      <p id={`${listId}-dica`} className="muted mt-1 text-xs">
        {t('cityHint')}
      </p>
    </div>
  );
}
