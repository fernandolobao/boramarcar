/**
 * Política de segurança de conteúdo (CSP), montada a cada requisição em `proxy.ts`.
 *
 * - **Aplicada**: scripts só com o _nonce_ da página (`'strict-dynamic'` deixa os scripts que eles
 *   carregam — Vercel Analytics, Contentsquare — rodarem); nada de `<object>`, `<base>` de fora,
 *   formulários para outros sites nem a página dentro de `<iframe>` alheio; conexões só por HTTPS.
 * - **Só relatada** (`Report-Only`): a mesma política com a lista exata de destinos de conexão e
 *   imagem. Violações vão para `/api/csp-report` (log na Vercel) sem quebrar nada; quando o log
 *   estiver limpo, dá para apertar a política aplicada.
 *
 * Estilos precisam de `'unsafe-inline'`: o React e as bibliotecas usam `style="…"`.
 */
export const CSP_REPORT_PATH = '/api/csp-report';

/** Destinos conhecidos (além do próprio site) para a política relatada. */
const CONNECT = [
  'https://*.contentsquare.net',
  'https://*.hotjar.com',
  'https://*.hotjar.io',
  'wss://*.hotjar.com',
];
const IMAGES = [
  'https://cards.scryfall.io',
  'https://svgs.scryfall.io',
  'https://lh3.googleusercontent.com',
  'https://tile.openstreetmap.org',
  'https://*.contentsquare.net',
  'https://*.hotjar.com',
];

export function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function serialize(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

export function buildCsp({ nonce, dev = false }: { nonce: string; dev?: boolean }) {
  const base: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-inline' e https: só valem em navegadores antigos (sem suporte a nonce/strict-dynamic).
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'unsafe-inline'",
      'https:',
      // O modo de desenvolvimento do Next (recarregar ao salvar) usa eval.
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const enforced = serialize({
    ...base,
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:', ...(dev ? ['ws:'] : [])],
    ...(dev ? {} : { 'upgrade-insecure-requests': [] }),
  });
  const reportOnly = serialize({
    ...base,
    'img-src': ["'self'", 'data:', 'blob:', ...IMAGES],
    'connect-src': ["'self'", ...CONNECT, ...(dev ? ['ws:'] : [])],
    'report-uri': [CSP_REPORT_PATH],
  });
  return { enforced, reportOnly };
}
