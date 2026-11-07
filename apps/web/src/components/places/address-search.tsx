'use client';

import type { AddressSuggestion } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Endereço com autocompletar (padrão ARIA "combobox" com lista), pelo OpenStreetMap. O texto
 * digitado também vale sem escolher sugestão; escolher uma traz as coordenadas para o mapa.
 */
export function AddressSearch({
  id,
  label,
  value,
  near,
  onChange,
  onPick,
}: {
  id: string;
  label: string;
  value: string;
  /** Ponto para priorizar resultados próximos (ex.: outro local do grupo). */
  near?: { lat: number; lng: number } | null;
  onChange: (value: string) => void;
  onPick: (suggestion: AddressSuggestion) => void;
}) {
  const t = useTranslations('places');
  const listId = useId();
  const [options, setOptions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const typed = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 3) return;
    let cancelled = false;
    // Espera parar de digitar: o serviço público pede uso moderado.
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const params = new URLSearchParams({ q });
        if (near) {
          params.set('lat', String(near.lat));
          params.set('lng', String(near.lng));
        }
        const { suggestions } = await api<{ suggestions: AddressSuggestion[] }>(
          `/api/v1/places?${params}`,
        );
        if (!cancelled) {
          setOptions(suggestions);
          setActive(-1);
          setStatus('idle');
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
          setStatus('error');
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, near]);

  const visible = open && value.trim().length >= 3 && options.length > 0;
  const choose = (s: AddressSuggestion) => {
    typed.current = false;
    onPick(s);
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
        autoComplete="street-address"
        maxLength={200}
        value={value}
        onChange={(e) => {
          typed.current = true;
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
      <p id={`${listId}-hint`} className="muted mt-1 text-xs">
        {t('addressHint')}
      </p>
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!visible}
        className="absolute z-[1000] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zinc-300 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        {options.map((s, i) => (
          <div
            key={`${s.label}-${i}`}
            id={`${listId}-${i}`}
            role="option"
            tabIndex={-1}
            aria-selected={i === active}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-brand-100 aria-selected:text-brand-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:aria-selected:bg-brand-700 dark:aria-selected:text-white"
            onMouseDown={(e) => {
              e.preventDefault();
              choose(s);
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {visible
          ? t('suggestions', { count: options.length })
          : status === 'loading'
            ? t('searching')
            : status === 'error'
              ? t('searchError')
              : ''}
      </p>
    </div>
  );
}
