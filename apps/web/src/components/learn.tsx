'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/**
 * "Marcar como concluída" de uma lição da trilha (12.1). Botão de alternar (`aria-pressed`): a
 * pessoa pode desmarcar. O resultado é anunciado; a página atualiza o progresso.
 */
export function LessonComplete({ lessonId, done }: { lessonId: string; done: boolean }) {
  const t = useTranslations('learn');
  const router = useRouter();
  const [completed, setCompleted] = useState(done);
  const [message, setMessage] = useState('');
  const { run, error, pending } = useApiAction();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        className="btn-secondary"
        aria-pressed={completed}
        disabled={pending}
        onClick={() =>
          void run(
            () =>
              api(`/api/v1/me/learn`, {
                method: 'POST',
                body: { lessonId, completed: !completed },
              }),
            () => {
              setCompleted(!completed);
              setMessage(!completed ? t('markedDone') : t('markedUndone'));
              router.refresh();
            },
          )
        }
      >
        <Icon name="done" />
        {completed ? t('done') : t('markDone')}
      </button>
      <p role="status" className="muted text-sm">
        {message}
      </p>
      <FormError message={error} />
    </div>
  );
}
