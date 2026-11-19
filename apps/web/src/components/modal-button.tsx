'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { useLightDismiss } from './use-light-dismiss';

/**
 * Botão que abre um `<dialog>` modal com o conteúdo (que pode vir do servidor). Esc, o botão
 * "Fechar" e um clique no fundo fecham; o foco volta para o botão. O conteúdo só existe aberto.
 */
export function ModalButton({
  label,
  title,
  icon,
  variant = 'secondary',
  children,
}: {
  label: string;
  /** Título do modal (padrão: o texto do botão). */
  title?: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary';
  /** O conteúdo; como função, recebe `close` (ex.: fechar depois de salvar). */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const t = useTranslations('common');
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useLightDismiss(ref);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {icon && <Icon name={icon} />}
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto max-h-[92dvh] w-[min(94vw,44rem)] overflow-y-auto rounded-2xl bg-surface p-5 text-fg shadow-2xl backdrop:bg-noite/70"
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {open && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-2xl font-semibold">
                {title ?? label}
              </h2>
              <button
                type="button"
                className="btn-secondary px-3"
                title={t('close')}
                onClick={() => ref.current?.close()}
              >
                <Icon name="close" />
                <span className="sr-only">{t('close')}</span>
              </button>
            </div>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>
        )}
      </dialog>
    </>
  );
}
