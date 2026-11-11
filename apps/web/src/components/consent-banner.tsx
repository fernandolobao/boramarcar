'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { saveConsent, type Consent } from '@/lib/consent';

/**
 * Aviso de cookies (LGPD): aparece enquanto a pessoa não escolheu. "Aceitar" e "Recusar" têm o
 * mesmo peso; nada não essencial carrega antes do "Aceitar". Não é modal (não prende o foco),
 * e enquanto está na tela a página reserva o espaço dele para o foco nunca ficar escondido
 * atrás do aviso (WCAG 2.4.11).
 */
export function ConsentBanner({ initial }: { initial: Consent | null }) {
  const t = useTranslations('consent');
  const [open, setOpen] = useState(initial === null);
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const root = document.documentElement;
    const reserve = () => {
      root.style.scrollPaddingBottom = `${el.offsetHeight + 16}px`;
      document.body.style.paddingBottom = `${el.offsetHeight}px`;
    };
    reserve();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reserve);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.scrollPaddingBottom = '';
      document.body.style.paddingBottom = '';
    };
  }, [open]);

  if (!open) return null;
  const choose = (consent: Consent) => {
    saveConsent(consent);
    setOpen(false);
  };
  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface text-fg shadow-2xl print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <h2 id={titleId} className="text-base font-semibold">
            {t('title')}
          </h2>
          <p>
            {t.rich('text', {
              link: (chunks) => (
                <Link href="/privacidade" className="text-link underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => choose('rejected')}>
            {t('reject')}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={() => choose('accepted')}>
            {t('accept')}
          </button>
        </div>
      </div>
    </section>
  );
}
