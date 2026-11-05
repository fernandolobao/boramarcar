'use client';

import { isValidTimeZone } from '@boramarcar/core/time';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * Mantém o cookie de fuso alinhado com a preferência salva. No primeiro acesso (sem
 * preferência), adota o fuso do navegador. Não renderiza nada.
 */
export function TimeZoneSync({
  savedTimeZone,
  cookieTimeZone,
}: {
  savedTimeZone: string | null;
  cookieTimeZone: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const target = savedTimeZone ?? (isValidTimeZone(browserTimeZone) ? browserTimeZone : null);
    if (!target || (savedTimeZone && cookieTimeZone === savedTimeZone)) return;
    let cancelled = false;
    api('/api/v1/me/preferences', { method: 'PUT', body: { timeZone: target } })
      .then(() => {
        if (!cancelled && target !== cookieTimeZone) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [savedTimeZone, cookieTimeZone, router]);

  return null;
}
