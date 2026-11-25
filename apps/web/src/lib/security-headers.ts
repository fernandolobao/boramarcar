/**
 * Cabeçalhos de segurança em todas as respostas (a CSP, que muda a cada página, vem do `proxy.ts`).
 * Geolocalização só para o próprio site: a busca de lojas (10.3) tem "Usar minha localização".
 */
export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()',
  },
];
