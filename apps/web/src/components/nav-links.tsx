'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icons';

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
    <nav aria-label={label} className="order-last w-full overflow-x-auto sm:order-none sm:w-auto">
      <ul className="flex gap-1 text-sm">
        {links.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-brand-500 aria-[current=page]:bg-zinc-100 aria-[current=page]:font-semibold dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-zinc-800"
              >
                {link.icon && <Icon name={link.icon} />}
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
