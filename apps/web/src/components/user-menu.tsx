'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Icon } from './icons';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Menu da conta (padrão "disclosure" de navegação: botão com aria-expanded + lista de links).
 * Fecha com Esc (foco volta ao botão), clique fora ou ao trocar de página.
 */
export function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Trocou de página: fecha (ajuste de estado durante a renderização, sem efeito).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const itemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-brand-500 aria-[current=page]:font-semibold dark:hover:bg-zinc-800';

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        className="btn-secondary gap-2 py-1.5 ps-1.5 pe-2.5"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-700 dark:text-white">
          {image ? (
            <Image src={image} alt="" fill sizes="32px" unoptimized className="object-cover" />
          ) : (
            <span aria-hidden="true">{initials(name)}</span>
          )}
        </span>
        <span className="max-w-32 truncate">{firstName}</span>
        <span className="sr-only">({t('userMenu')})</span>
        <Icon
          name="chevronDown"
          className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute end-0 z-20 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <p className="border-b border-zinc-200 px-3 pt-1 pb-2 text-sm dark:border-zinc-700">
          <span className="muted block text-xs">{t('signedInAs')}</span>
          <span className="block truncate font-medium">{name}</span>
          <span className="muted block truncate text-xs">{email}</span>
        </p>
        <ul className="mt-1 space-y-0.5">
          <li>
            <Link
              href="/perfil"
              className={itemClass}
              aria-current={pathname === '/perfil' ? 'page' : undefined}
            >
              <Icon name="profile" />
              {t('profile')}
            </Link>
          </li>
          <li>
            <Link
              href="/configuracoes"
              className={itemClass}
              aria-current={pathname === '/configuracoes' ? 'page' : undefined}
            >
              <Icon name="settings" />
              {t('settings')}
            </Link>
          </li>
          <li className="mt-1 border-t border-zinc-200 pt-1 dark:border-zinc-700">
            <button
              type="button"
              className={itemClass}
              onClick={async () => {
                await authClient.signOut();
                router.push('/');
                router.refresh();
              }}
            >
              <Icon name="signOut" />
              {tc('signOut')}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
