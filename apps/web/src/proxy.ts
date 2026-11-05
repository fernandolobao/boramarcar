import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Verificação otimista: sem cookie de sessão, redireciona para a página inicial.
 * A validação real da sessão acontece nas páginas e na API.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/painel/:path*',
    '/grupo/:path*',
    '/disponibilidade/:path*',
    '/eventos/:path*',
    '/ranking/:path*',
    '/decks/:path*',
  ],
};
