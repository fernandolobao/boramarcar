/** Limita `value` a [min, max] (limites ausentes não restringem). */
export function clampNumber(value: number, min?: number, max?: number): number {
  let v = value;
  if (min !== undefined && v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

/** Um passo de −/+ a partir do valor atual; vazio (`null`) parte do mínimo, ou de 0. */
export function stepNumber(
  value: number | null,
  delta: number,
  opts: { min?: number; max?: number; step?: number },
): number {
  // Vazio: o primeiro passo vai para o mínimo (ou um passo a partir de zero, sem mínimo).
  if (value === null) return clampNumber(opts.min ?? delta * (opts.step ?? 1), opts.min, opts.max);
  return clampNumber(value + delta * (opts.step ?? 1), opts.min, opts.max);
}

/** Texto digitado → inteiro; vazio ou inválido → `null`. */
export function parseNumberInput(text: string): number | null {
  const t = text.trim();
  return /^-?\d+$/.test(t) ? Number(t) : null;
}

/** Nome acessível dos botões −/+: textos do app com `{label}` e `{value}` ("—" quando vazio). */
export function stepperLabel(
  label: string,
  direction: 'down' | 'up',
  value: number | null,
  labels: { decrease: string; increase: string },
): string {
  const text = direction === 'up' ? labels.increase : labels.decrease;
  return text.replace('{label}', label).replace('{value}', value === null ? '—' : String(value));
}

/** Contrato do NumberField (site e app). */
export interface NumberFieldProps {
  label: string;
  /** `null` = vazio (campos opcionais). */
  value: number | null;
  onChange(value: number | null): void;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  error?: string;
  disabled?: boolean;
  /** Textos dos botões, com `{label}` e `{value}` (vêm das mensagens de cada app). */
  labels: { decrease: string; increase: string };
}
