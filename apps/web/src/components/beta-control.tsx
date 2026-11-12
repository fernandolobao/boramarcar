'use client';

import { zonedLocalToUtc } from '@boramarcar/core/time';
import { useTimeZone, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

type Phase = 'draft' | 'scheduled' | 'running' | 'ended';

/** Data (AAAA-MM-DD) no fuso de quem administra. */
const localDate = (iso: string | null, timeZone: string) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso)) : '';

/**
 * Controle do beta assistido (8.5) no /admin: escolhe os grupos e decide quando começa — numa
 * data marcada, agora mesmo, ou sem data (rascunho). Encerrar antes da hora pede dois cliques.
 */
export function BetaControl({
  phase,
  startsAt,
  groups,
}: {
  phase: Phase;
  startsAt: string | null;
  groups: { id: string; name: string; members: number; inBeta: boolean }[];
}) {
  const t = useTranslations('admin.beta');
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const [selected, setSelected] = useState(
    () => new Set(groups.filter((g) => g.inBeta).map((g) => g.id)),
  );
  const [date, setDate] = useState(() => localDate(startsAt, timeZone));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const { run, error, pending } = useApiAction();

  useEffect(() => {
    if (saved) status.current?.focus();
  }, [saved]);

  const save = (start: Date | null, message: string) =>
    void run(
      () =>
        api('/api/v1/admin/beta', {
          method: 'PUT',
          body: { groupIds: [...selected], startsAt: start?.toISOString() ?? null },
        }),
      () => {
        if (start) setDate(localDate(start.toISOString(), timeZone));
        setSaved(message);
      },
    );

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(date ? zonedLocalToUtc(`${date}T00:00`, timeZone) : null, t('saved'));
      }}
    >
      <fieldset className="space-y-2">
        <legend className="label">{t('groups')}</legend>
        {groups.length === 0 ? (
          <p className="muted">{t('noGroups')}</p>
        ) : (
          <ul className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <label className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggle(g.id)}
                  />
                  <span className="min-w-0 flex-1">{g.name}</span>
                  <span className="muted">{t('members', { count: g.members })}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">{t('selected', { count: selected.size })}</p>
      </fieldset>

      <div className="max-w-xs">
        <label htmlFor="beta-inicio" className="label">
          {t('startDate')}
        </label>
        <input
          id="beta-inicio"
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-describedby="beta-inicio-dica"
        />
        <p id="beta-inicio-dica" className="muted mt-1">
          {t('startHint')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          <Icon name="save" />
          {t('save')}
        </button>
        {phase !== 'running' && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending || selected.size === 0}
            onClick={() => save(new Date(), t('started'))}
          >
            <Icon name="play" />
            {t('startNow')}
          </button>
        )}
        {(phase === 'running' || phase === 'scheduled') && (
          <button
            type="button"
            className={confirmEnd ? 'btn-danger border border-danger' : 'btn-danger'}
            disabled={pending}
            onClick={() => {
              if (!confirmEnd) return setConfirmEnd(true);
              setConfirmEnd(false);
              void run(
                () => api('/api/v1/admin/beta/encerrar', { method: 'POST' }),
                () => setSaved(t('ended')),
              );
            }}
          >
            <Icon name="finish" />
            {confirmEnd ? t('endConfirm') : t('end')}
          </button>
        )}
      </div>
      {saved && (
        <p ref={status} role="status" tabIndex={-1} className="font-medium focus:outline-none">
          {saved}
        </p>
      )}
      <FormError message={error} />
    </form>
  );
}
