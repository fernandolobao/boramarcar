'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Campo de carta com autocompletar do Scryfall (padrão ARIA 1.2 "combobox" com lista).
 * Setas navegam, Enter escolhe, Esc fecha; a lista aparece a partir de 2 letras.
 */
export function CardSearch({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('decks');
  const listId = useId();
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    let cancelled = false;
    // Espera o usuário parar de digitar (Scryfall pede no máximo ~10 req/s).
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { names } = await api<{ names: string[] }>(
          `/api/v1/cards/autocomplete?q=${encodeURIComponent(q)}`,
        );
        if (!cancelled) {
          setOptions(names.slice(0, 10));
          setActive(-1);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const visible = open && value.trim().length >= 2 && options.length > 0;
  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setOptions([]);
    setActive(-1);
  };

  return (
    <div className="relative">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={`${listId}-hint`}
        autoComplete="off"
        spellCheck={false}
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
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
      <p id={`${listId}-hint`} className="sr-only">
        {t('searchHint')}
      </p>
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!visible}
        className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-ink-300 bg-surface p-1 shadow-xl dark:border-ink-700 dark:bg-ink-900"
      >
        {options.map((name, i) => (
          <div
            key={name}
            id={`${listId}-${i}`}
            role="option"
            tabIndex={-1}
            aria-selected={i === active}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-brand-100 aria-selected:text-brand-700 hover:bg-ink-100 dark:hover:bg-ink-800 dark:aria-selected:bg-brand-700 dark:aria-selected:text-white"
            // mousedown (antes do blur do campo) para escolher sem fechar a lista primeiro.
            onMouseDown={(e) => {
              e.preventDefault();
              choose(name);
            }}
          >
            {name}
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {visible ? t('suggestions', { count: options.length }) : loading ? t('searching') : ''}
      </p>
    </div>
  );
}
