'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

export interface AttendanceMember {
  userId: string;
  name: string;
  attended: number;
  of: number;
  /** Datas em ISO (vêm do servidor). */
  lastGameAt: string | null;
  awaySince: string | null;
}

const WEEK = 7 * 24 * 3600_000;

/**
 * "Quem anda sumido" (só dono e admins): presença nos últimos encontros, última partida e quem
 * não aparece há um tempo, com "Chamar" para o próximo encontro (um aviso por pessoa).
 */
export function AttendanceCard({
  groupId,
  members,
  nextEvent,
  nudged: initialNudged,
  confirmedNext,
  viewerId,
  now,
}: {
  groupId: string;
  members: AttendanceMember[];
  nextEvent: { id: string; title: string; startsAt: string } | null;
  nudged: string[];
  /** Quem já confirmou o próximo encontro (não precisa ser chamado). */
  confirmedNext: string[];
  viewerId: string;
  now: string;
}) {
  const t = useTranslations('group.attendance');
  const format = useFormatter();
  const id = useId();
  const { run, error } = useApiAction();
  const [nudged, setNudged] = useState(() => new Set(initialNudged));
  const [sent, setSent] = useState('');

  const nudge = (m: AttendanceMember) =>
    nextEvent &&
    void run(
      () =>
        api(`/api/v1/groups/${groupId}/members/${m.userId}/nudge`, {
          method: 'POST',
          body: { eventId: nextEvent.id },
        }),
      () => {
        setNudged((s) => new Set(s).add(m.userId));
        setSent(t('sent', { name: m.name }));
      },
    );

  return (
    <section className="card space-y-3" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title mb-0">
        {t('title')}
      </h2>
      <p className="muted">{t('hint')}</p>
      <p className="muted">
        {nextEvent
          ? t('next', {
              title: nextEvent.title,
              when: format.dateTime(new Date(nextEvent.startsAt), {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : t('noNext')}
      </p>
      <table className="w-full text-sm">
        <caption className="sr-only">{t('caption')}</caption>
        <thead>
          <tr className="border-b border-line text-start">
            <th scope="col" className="py-2 pe-2 text-start font-semibold">
              {t('person')}
            </th>
            <th scope="col" className="py-2 pe-2 text-start font-semibold">
              {t('attendance')}
            </th>
            <th scope="col" className="py-2 text-start font-semibold">
              {t('lastGame')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {members.map((m) => {
            const weeks = m.awaySince
              ? Math.max(1, Math.floor((Date.parse(now) - Date.parse(m.awaySince)) / WEEK))
              : 0;
            const isNudged = nudged.has(m.userId);
            return (
              <tr key={m.userId} className="align-top">
                <th scope="row" className="py-2 pe-2 text-start font-medium">
                  <span className="block">{m.name}</span>
                  {m.awaySince && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-normal text-fg-muted">
                      <Icon name="warning" className="size-3.5" />
                      {t('away', { weeks })}
                    </span>
                  )}
                  {nextEvent && m.userId !== viewerId && !confirmedNext.includes(m.userId) && (
                    <span className="mt-1 block">
                      {isNudged ? (
                        <button
                          type="button"
                          className="btn-secondary min-h-9 px-3 text-xs"
                          disabled
                          aria-label={t('nudgedLabel', { name: m.name })}
                        >
                          <Icon name="done" />
                          {t('nudged')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary min-h-9 px-3 text-xs"
                          aria-label={t('nudgeLabel', { name: m.name })}
                          onClick={() => nudge(m)}
                        >
                          <Icon name="email" />
                          {t('nudge')}
                        </button>
                      )}
                    </span>
                  )}
                </th>
                <td className="py-2 pe-2 tabular-nums">
                  {t('attended', { attended: m.attended, of: m.of })}
                </td>
                <td className="py-2">
                  {m.lastGameAt
                    ? format.dateTime(new Date(m.lastGameAt), { day: 'numeric', month: 'short' })
                    : t('never')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <FormError message={error} />
      <p role="status" className="sr-only">
        {sent}
      </p>
    </section>
  );
}
