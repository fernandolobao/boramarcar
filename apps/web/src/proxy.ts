import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, nonce as makeNonce } from '@/lib/csp';

/** Páginas que exigem login. */
const PROTECTED = [
  '/painel',
  '/grupo',
  '/disponibilidade',
  '/eventos',
  '/ranking',
  '/decks',
  '/colecao',
  '/perfil',
  '/jogadores',
  '/configuracoes',
];

const isProtected = (path: string) =>
  PROTECTED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/**
 * Em toda página:
 * - Política de segurança de conteúdo com um _nonce_ novo (`lib/csp.ts`). O Next lê o nonce do
 *   cabeçalho da requisição e o põe nos scripts dele; o layout usa `x-nonce` no script do tema.
 * - Verificação otimista de login: sem cookie de sessão, as páginas da área logada redirecionam
 *   para a página inicial. A validação real da sessão acontece nas páginas e na API.
 */
export function proxy(request: NextRequest) {
  if (isProtected(request.nextUrl.pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const nonce = makeNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === 'development' });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp.enforced);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', csp.enforced);
  response.headers.set('content-security-policy-report-only', csp.reportOnly);
  return response;
}

export const config = {
  // Tudo menos API, arquivos do Next, o túnel do Sentry e arquivos com extensão (public/).
  matcher: ['/((?!api/|_next/static|_next/image|monitoring|.*\\.[a-z0-9]+$).*)'],
};
