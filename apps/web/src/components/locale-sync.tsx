'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * Mantém o cookie de idioma igual ao idioma salvo no perfil. Num navegador ou endereço novo (ex.:
 * o preview de um deploy), o cookie não existe e o idioma cairia no do navegador; aqui ele volta
 * para o salvo e a página é recarregada. Não renderiza nada.
 */
export function LocaleSync({
  savedLocale,
  currentLocale,
}: {
  savedLocale: string | null;
  currentLocale: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!savedLocale || savedLocale === currentLocale) return;
    let cancelled = false;
    api('/api/v1/me/preferences', { method: 'PUT', body: { locale: savedLocale } })
      .then(() => {
        if (!cancelled) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [savedLocale, currentLocale, router]);
  return null;
}
