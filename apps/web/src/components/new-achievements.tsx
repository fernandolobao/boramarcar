'use client';

import type { AchievementId } from '@boramarcar/core';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { ACHIEVEMENT_ICON } from './achievement-icons';
import { Icon } from './icons';
import { useLightDismiss } from './use-light-dismiss';

/**
 * Janela de conquistas novas: abre sozinha no painel ou no perfil quando a pessoa ganhou
 * conquistas desde a última vez (de uma ou várias partidas), todas juntas. Ao fechar (botão,
 * Esc ou clique fora), as mostradas contam como vistas.
 */
export function NewAchievements({
  achievements,
  showProfileLink = true,
}: {
  achievements: { id: AchievementId; unlockedAt: string | null }[];
  /** No próprio perfil, o link "Ver todas no perfil" não faz sentido. */
  showProfileLink?: boolean;
}) {
  const t = useTranslations('newAchievements');
  const ta = useTranslations('achievements');
  const format = useFormatter();
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useLightDismiss(ref);
  const [done, setDone] = useState(false);
  const marked = useRef(false);

  useEffect(() => {
    if (achievements.length > 0 && !ref.current?.open) ref.current?.showModal();
  }, [achievements.length]);

  if (achievements.length === 0 || done) return null;

  const markSeen = () => {
    if (marked.current) return;
    marked.current = true;
    void api('/api/v1/me/achievements/seen', {
      method: 'POST',
      body: { ids: achievements.map((a) => a.id) },
    }).catch(() => {});
    setDone(true);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto max-h-[90dvh] w-[min(94vw,30rem)] overflow-y-auto rounded-2xl bg-surface p-5 text-fg shadow-2xl backdrop:bg-noite/70"
      onClose={markSeen}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
            <Icon name="achievement" className="size-6" />
          </span>
          <div>
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {t('title', { count: achievements.length })}
            </h2>
            <p className="muted">{t('intro')}</p>
          </div>
        </div>
        <ul className="space-y-3">
          {achievements.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-xl bg-surface-muted p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <Icon name={ACHIEVEMENT_ICON[a.id]} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{ta(`items.${a.id}.name`)}</span>
                <span className="block text-sm">{ta(`items.${a.id}.description`)}</span>
                {a.unlockedAt && (
                  <span className="muted block text-xs">
                    {ta('unlockedOn', {
                      date: format.dateTime(new Date(a.unlockedAt), { dateStyle: 'medium' }),
                    })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showProfileLink && (
            <Link href="/perfil" className="btn-secondary" onClick={() => ref.current?.close()}>
              {t('viewAll')}
            </Link>
          )}
          <button type="button" className="btn-primary" onClick={() => ref.current?.close()}>
            {t('close')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
