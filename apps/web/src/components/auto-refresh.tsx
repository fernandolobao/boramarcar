'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Atualiza a página do servidor de tempos em tempos (acompanhar ao vivo), só com a aba visível.
 * Sem anúncio para leitor de tela: quem quer ouvir as mudanças usa as regiões de status da página.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
