'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';

/**
 * Conteúdo do link com o retorno imediato do clique: enquanto a página nova não chega, o item fica
 * destacado e um ponto pulsa ao lado (o "Carregando…" para leitores de tela vem da barra do topo e
 * do esqueleto da página).
 */
function LinkContent({ label, icon }: { label: string; icon?: IconName }) {
  const { pending } = useLinkStatus();
  return (
    <span data-pending={pending || undefined} className="flex items-center gap-1.5">
      {icon && <Icon name={icon} />}
      {/* A largura já é a do texto em negrito: ficar ativo não alarga o item nem empurra os
          vizinhos (o menu "tremia" a cada troca de seção). */}
      <span className="grid">
        <span className="col-start-1 row-start-1">{label}</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-semibold">
          {label}
        </span>
      </span>
      {/* Ponto de carregamento por cima, no canto: não muda a largura do item. */}
      {pending && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
        />
      )}
    </span>
  );
}

/** Links da navegação principal com `aria-current="page"` na seção atual. */
export function NavLinks({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string; icon?: IconName }[];
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Há mais itens escondidos à esquerda/direita? (no celular as abas rolam para o lado)
  const [more, setMore] = useState({ start: false, end: false });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const max = nav.scrollWidth - nav.clientWidth;
      setMore({ start: nav.scrollLeft > 4, end: nav.scrollLeft < max - 4 });
    };
    const frame = requestAnimationFrame(update);
    nav.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      nav.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // A aba da seção atual fica à vista (sem rolar a página, só a faixa de abas).
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const left = current.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + current.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - 16;
    }
  }, [pathname]);

  // Degradê nas bordas que têm mais abas: a pista de que a faixa rola.
  const fade = (on: boolean) => (on ? 'transparent' : '#000');
  const mask =
    more.start || more.end
      ? `linear-gradient(to right, ${fade(more.start)} 0, #000 2.5rem, #000 calc(100% - 2.5rem), ${fade(more.end)} 100%)`
      : undefined;

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="-mx-2 overflow-x-auto px-2 pb-2"
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      <ul className="flex gap-1 text-sm">
        {links.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                transitionTypes={['nav-section']}
                aria-current={current ? 'page' : undefined}
                className="relative flex items-center rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus aria-[current=page]:bg-surface-muted aria-[current=page]:font-semibold has-[[data-pending]]:bg-surface-muted has-[[data-pending]]:font-semibold"
              >
                <LinkContent label={link.label} icon={link.icon} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
