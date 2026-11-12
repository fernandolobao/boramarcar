'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * Grava o cookie de idioma quando ele falta neste navegador ou endereço (ex.: o preview de um
 * deploy). A página já veio no idioma salvo no perfil (`i18n/request.ts` usa o salvo quando não
 * há cookie); o cookie só evita consultar o perfil a cada página. Com cookie, ele manda: é a
 * escolha feita neste navegador. Não renderiza nada.
 */
export function LocaleSync({
  savedLocale,
  hasCookie,
}: {
  savedLocale: string | null;
  hasCookie: boolean;
}) {
  useEffect(() => {
    if (!savedLocale || hasCookie) return;
    api('/api/v1/me/preferences', { method: 'PUT', body: { locale: savedLocale } }).catch(() => {});
  }, [savedLocale, hasCookie]);
  return null;
}
