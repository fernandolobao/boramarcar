import Link from 'next/link';
import { Fragment } from 'react';

/**
 * Nome de jogador que leva ao perfil (`/jogadores/:id`; o próprio vai para `/perfil`). Sublinhado
 * discreto para não depender só da cor (WCAG 1.4.1).
 */
export function PlayerLink({
  userId,
  name,
  className = '',
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/jogadores/${userId}`}
      className={`rounded-sm underline decoration-fg-muted/50 decoration-1 underline-offset-2 hover:decoration-current ${className}`}
    >
      {name}
    </Link>
  );
}

/** Lista de jogadores separada por vírgulas, cada nome com link para o perfil. */
export function PlayerLinks({ players }: { players: readonly { userId: string; name: string }[] }) {
  return (
    <>
      {players.map((p, i) => (
        <Fragment key={p.userId}>
          {i > 0 && ', '}
          <PlayerLink userId={p.userId} name={p.name} />
        </Fragment>
      ))}
    </>
  );
}
