import type { StatProps } from '@boramarcar/ui';

/**
 * Cartão de número do design system: rótulo (`dt`) e valor (`dd`), com uma dica opcional. Vai
 * dentro de um `<dl>`. `size="sm"` para fileiras compactas (ex.: estatísticas do grupo).
 */
export function Stat({ label, value, hint, size = 'md' }: StatProps & { size?: 'sm' | 'md' }) {
  const small = size === 'sm';
  return (
    <div className={`rounded-xl bg-canvas ${small ? 'p-2' : 'p-3'}`}>
      <dt className={`muted ${small ? 'text-xs' : 'text-sm'}`}>{label}</dt>
      <dd>
        <span
          className={`block tabular-nums ${small ? 'text-xl font-bold' : 'text-2xl font-semibold'}`}
        >
          {value}
        </span>
        {hint && <span className="muted block text-xs">{hint}</span>}
      </dd>
    </div>
  );
}
