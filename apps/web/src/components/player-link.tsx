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

/**
 * Lista de jogadores separada por vírgulas, cada nome com link para o perfil. Com `lastSeparator`
 * (ex.: " e "), o último nome vem depois dele: "Ana, Bia e Caio".
 */
export function PlayerLinks({
  players,
  lastSeparator,
}: {
  players: readonly { userId: string; name: string }[];
  lastSeparator?: string;
}) {
  return (
    <>
      {players.map((p, i) => (
        <Fragment key={p.userId}>
          {i > 0 && (lastSeparator && i === players.length - 1 ? lastSeparator : ', ')}
          <PlayerLink userId={p.userId} name={p.name} />
        </Fragment>
      ))}
    </>
  );
}
