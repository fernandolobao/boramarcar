'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
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
      {label}
      {pending && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
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
  return (
    <nav aria-label={label} className="-mx-2 overflow-x-auto px-2 pb-2">
      <ul className="flex gap-1 text-sm">
        {links.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                transitionTypes={['nav-section']}
                aria-current={current ? 'page' : undefined}
                className="flex items-center rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus aria-[current=page]:bg-surface-muted aria-[current=page]:font-semibold has-[[data-pending]]:bg-surface-muted has-[[data-pending]]:font-semibold"
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
