'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, type Consent } from '@/lib/consent';
import { CONTENTSQUARE_TAG_ID, contentsquareTagUrl } from '@/lib/session-insights';

/**
 * Gravação de sessões e mapas de calor (Hotjar, hoje parte do Contentsquare), para entender onde
 * as pessoas travam. Só carrega com consentimento (aviso de cookies ou Configurações) e depois
 * da página ficar interativa. Ao retirar o consentimento, a página recarrega sem a tag.
 * Campos de formulário são mascarados pela ferramenta; e-mails exibidos levam `data-cs-mask`.
 */
export function SessionInsights({
  enabled,
  consent: initial,
}: {
  enabled: boolean;
  consent: Consent | null;
}) {
  const [consent, setConsent] = useState(initial);

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Consent>).detail;
      setConsent((previous) => {
        // A tag já carregada não se desliga sozinha: recarrega a página sem ela.
        if (previous === 'accepted' && next === 'rejected') window.location.reload();
        return next;
      });
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  const src = contentsquareTagUrl(CONTENTSQUARE_TAG_ID);
  if (!enabled || !src || consent !== 'accepted') return null;
  return <Script id="contentsquare" src={src} strategy="afterInteractive" />;
}
