import type { ReactNode } from 'react';
import { ManaSymbol } from './mana';

/**
 * Estado vazio com cara de ArcanaKin: os cinco símbolos de mana (decorativos, `aria-hidden`)
 * sobre um brilho suave, o texto e, se houver, uma ação. O texto é o conteúdo; os símbolos são
 * só enfeite.
 */
export function EmptyState({
  children,
  action,
  symbols = ['W', 'U', 'B', 'R', 'G'],
}: {
  children: ReactNode;
  action?: ReactNode;
  symbols?: readonly string[];
}) {
  return (
    <div className="empty-state flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center">
      <p className="flex gap-1.5 text-2xl" aria-hidden="true">
        {symbols.map((s, i) => (
          <ManaSymbol key={`${s}-${i}`} symbol={s} />
        ))}
      </p>
      <div className="muted max-w-prose text-balance">{children}</div>
      {action}
    </div>
  );
}
