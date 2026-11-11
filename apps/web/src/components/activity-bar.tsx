'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { activity } from '@/lib/activity';

/** O clique leva a outra página do próprio site (e não abre em outra aba nem baixa arquivo)? */
export function isInternalNavigation(e: MouseEvent, location: Location): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null;
  }
  const a = (e.target as Element | null)?.closest?.('a[href]');
  if (!(a instanceof HTMLAnchorElement)) return null;
  if (a.target && a.target !== '_self') return null;
  if (a.hasAttribute('download')) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  // Mesma página (ou só a âncora): não há carregamento.
  if (url.pathname === location.pathname && url.search === location.search) return null;
  return url.pathname + url.search;
}

/**
 * Barra fina no topo enquanto algo carrega: uma ação na API (`useApiAction`) ou a ida para
 * outra página. Para leitores de tela, "Carregando…" numa região de status.
 */
export function ActivityBar() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const search = useSearchParams();
  const here = `${pathname}?${search.toString()}`;
  /** Página onde o clique num link aconteceu: enquanto ainda estamos nela, está carregando. */
  const [leaving, setLeaving] = useState<string | null>(null);
  const busy = useSyncExternalStore(activity.subscribe, activity.get, () => false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isInternalNavigation(e, window.location)) return;
      const from = `${window.location.pathname}?${new URLSearchParams(window.location.search)}`;
      setLeaving(from);
      // Por segurança: nunca fica presa (ex.: a navegação foi cancelada).
      setTimeout(() => setLeaving((current) => (current === from ? null : current)), 10_000);
    };
    // Bolha (não captura): o Link do Next já decidiu se cancela o clique.
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // A página nova chegou (ou o "voltar" do navegador): `here` mudou e a barra some sozinha.
  const active = leaving === here || busy;
  return (
    <>
      {active && <div className="activity-bar" aria-hidden="true" />}
      <p role="status" className="sr-only">
        {active ? t('loading') : ''}
      </p>
    </>
  );
}
