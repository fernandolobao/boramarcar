'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

const KINDS = ['problem', 'idea', 'other'] as const;
type Kind = (typeof KINDS)[number];

/** Formulário de feedback do beta (8.4). `page` é o caminho de onde a pessoa veio. */
export function FeedbackForm({ page }: { page: string | null }) {
  const t = useTranslations('feedback');
  const id = useId();
  const [kind, setKind] = useState<Kind>('problem');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);
  const { run, error, pending } = useApiAction();
  // A confirmação recebe o foco quando aparece (o formulário some).
  useEffect(() => {
    if (sent) status.current?.focus();
  }, [sent]);

  if (sent) {
    return (
      <div className="space-y-3">
        <p ref={status} role="status" tabIndex={-1} className="font-medium focus:outline-none">
          {t('sent')}
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setMessage('');
            setSent(false);
          }}
        >
          <Icon name="feedback" />
          {t('sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api('/api/v1/feedback', {
              method: 'POST',
              body: { kind, message, page, platform: 'web' },
            }),
          () => setSent(true),
        );
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">{t('kind')}</legend>
        {KINDS.map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={`${id}-kind`}
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="size-5"
            />
            {t(`kinds.${k}`)}
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <label htmlFor={`${id}-message`} className="font-medium">
          {t('message')}
        </label>
        <p id={`${id}-hint`} className="muted">
          {t('messageHint')}
        </p>
        <textarea
          id={`${id}-message`}
          aria-describedby={`${id}-hint`}
          required
          minLength={3}
          maxLength={2000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input min-h-32 py-2"
        />
      </div>
      {page && <p className="muted">{t('page', { page })}</p>}
      <p className="muted">{t('privacy')}</p>
      <button type="submit" className="btn-primary" disabled={pending}>
        <Icon name="feedback" />
        {t('send')}
      </button>
      <FormError message={error} />
    </form>
  );
}
