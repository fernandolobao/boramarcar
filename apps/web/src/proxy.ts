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
  '/feedback',
  '/admin',
  '/mesa',
];

/**
 * Robôs que geram prévia de link (e buscadores). Eles não têm login: em vez de mandá-los para a
 * home, mostramos a prévia pública da página (`/previa/...`).
 */
const PREVIEW_BOT =
  /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|applebot|googlebot|bingbot|duckduckbot|yandex|vkshare|mastodon|bluesky|signal|snapchat|viber|outbrain|quora link preview/i;

const isProtected = (path: string) =>
  PROTECTED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/**
 * Em toda página:
 * - Política de segurança de conteúdo com um _nonce_ novo (`lib/csp.ts`). O Next lê o nonce do
 *   cabeçalho da requisição e o põe nos scripts dele; o layout usa `x-nonce` no script do tema.
 * - Verificação otimista de login: sem cookie de sessão, as páginas da área logada redirecionam
 *   para a página inicial (robôs de prévia de link veem a prévia pública, `/previa/...`). A
 *   validação real da sessão acontece nas páginas e na API.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const anonymous = isProtected(pathname) && !getSessionCookie(request);
  const bot = anonymous && PREVIEW_BOT.test(request.headers.get('user-agent') ?? '');
  if (anonymous && !bot) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const nonce = makeNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === 'development' });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp.enforced);
  const response = bot
    ? NextResponse.rewrite(new URL(`/previa${pathname}`, request.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', csp.enforced);
  response.headers.set('content-security-policy-report-only', csp.reportOnly);
  return response;
}

export const config = {
  // Tudo menos API, arquivos do Next, o túnel do Sentry e arquivos com extensão (public/).
  matcher: ['/((?!api/|_next/static|_next/image|monitoring|.*\\.[a-z0-9]+$).*)'],
};
