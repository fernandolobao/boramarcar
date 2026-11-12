'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * "Voltar" de páginas que se abrem de vários lugares (ex.: Política de Privacidade, aberta pelo
 * rodapé do app, pelas configurações ou pela página inicial): volta para a página de onde a
 * pessoa veio, se ela veio de dentro do site. Aberta direto (link externo, nova aba), vai para
 * `fallback`. Continua sendo um link de verdade (Ctrl/Cmd+clique abre o `fallback`).
 */
export function HistoryBackLink({
  fallback,
  className,
  children,
}: {
  fallback: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        let sameSite = false;
        try {
          sameSite = new URL(document.referrer).origin === window.location.origin;
        } catch {
          sameSite = false;
        }
        if (sameSite && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
