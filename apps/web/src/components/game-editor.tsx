'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { GameForm, type GameInitial, type GamePlayerOption } from './game-form';
import { Icon } from './icons';

/** Botão "Editar partida N" que abre o formulário completo da partida logo abaixo. */
export function GameEditor({
  gameId,
  number,
  players,
  initial,
}: {
  gameId: string;
  number: number;
  players: GamePlayerOption[];
  initial: GameInitial;
}) {
  const t = useTranslations('events');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <div className="mt-3">
      <button
        ref={toggle}
        type="button"
        className="btn-secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {/* O nome fica igual aberto ou fechado; o estado vem de aria-expanded. */}
        <Icon name={open ? 'close' : 'edit'} />
        {t('editGame', { number })}
      </button>
      <div id={panelId} hidden={!open} className="mt-4">
        {open && (
          <GameForm
            gameId={gameId}
            players={players}
            defaultFormat={initial.format}
            initial={initial}
            onSaved={() => {
              setOpen(false);
              // O formulário some: o foco volta para o botão que o abriu.
              toggle.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}
