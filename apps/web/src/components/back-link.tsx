'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Icon } from './icons';

/** Caminhos das páginas da navegação principal (sem botão de voltar). */
export type MainPaths = readonly string[];

/**
 * Para onde "voltar" leva quando não há página anterior no app (entrou pelo link direto):
 * a página "mãe" do caminho. Ex.: /decks/x/imprimir → /decks/x; /jogadores/x → /grupo.
 */
export function parentPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return '/painel';
  if (parts[0] === 'jogadores') return '/grupo';
  return `/${parts.slice(0, -1).join('/')}`;
}

export function isMainPage(pathname: string, main: MainPaths): boolean {
  return main.includes(pathname.replace(/\/$/, '') || '/');
}

/*
 * Pilha das páginas visitadas dentro do app nesta aba (só em memória: some ao recarregar).
 * Se a nova página é a penúltima da pilha, foi um "voltar" (nosso ou do navegador): desempilha.
 */
const visited: string[] = [];
/** Só para testes: esquece as páginas visitadas. */
export function resetVisited() {
  visited.length = 0;
}
function track(pathname: string) {
  if (visited.at(-1) === pathname) return;
  if (visited.at(-2) === pathname) visited.pop();
  else visited.push(pathname);
}

/**
 * Botão "Voltar" das páginas que não são da navegação principal. Volta para a página anterior
 * do app quando houver uma; senão (link direto, nova aba), vai para a página "mãe". É um link de
 * verdade: Ctrl/Cmd+clique e "abrir em nova aba" levam à página mãe.
 */
export function BackLink({ main }: { main: MainPaths }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common');

  useEffect(() => track(pathname), [pathname]);

  if (isMainPage(pathname, main)) return null;
  return (
    <Link
      href={parentPath(pathname)}
      className="inline-flex min-h-6 items-center gap-1.5 rounded-md text-sm font-medium text-link underline-offset-2 hover:underline print:hidden"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (visited.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      <Icon name="back" />
      {t('back')}
    </Link>
  );
}
