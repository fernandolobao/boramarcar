/** Expo Go numa rede local (IP privado): `exp://192.168.x.x:8081/--/…` e semelhantes. */
const EXPO_GO_LAN = [
  'exp://192.168.*.*:*/**',
  'exp://10.*.*.*:*/**',
  ...Array.from({ length: 16 }, (_, i) => `exp://172.${16 + i}.*.*:*/**`),
];

/**
 * Para onde o login social pode voltar além do próprio site:
 * - o app instalado (`arcanakin://`; `boramarcar://`, o esquema anterior ao rebranding, continua
 *   aceito até as versões antigas saírem de uso);
 * - o Expo Go: em desenvolvimento, qualquer `exp://`; em produção só com `EXPO_GO_LOGIN=lan`
 *   (para testar o app sem build próprio) e só em IP de rede local — um link `exp://` público
 *   (túnel) poderia entregar a sessão a outro projeto;
 * - na Vercel, os previews deste projeto (login pelo OAuth proxy).
 */
export function authTrustedOrigins(env: {
  NODE_ENV?: string;
  EXPO_GO_LOGIN?: string;
  VERCEL_ENV?: string;
}) {
  const app = ['arcanakin://', 'boramarcar://'];
  if (env.NODE_ENV === 'development') return [...app, 'exp://', 'exp://**'];
  return [
    ...app,
    ...(env.EXPO_GO_LOGIN === 'lan' ? EXPO_GO_LAN : []),
    // Login nos previews da Vercel (OAuth proxy): só os deste projeto, nesta conta.
    ...(env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview' ? [PREVIEW_ORIGINS] : []),
  ];
}

/** Endereços dos previews deste projeto na Vercel (`boramarcar-git-<branch>-…`, `boramarcar-<hash>-…`). */
export const PREVIEW_ORIGINS = 'https://boramarcar-*-fernandolobaos-projects.vercel.app';

/** Site de produção: onde o Google devolve o login (única URL cadastrada no Google). */
export const PRODUCTION_ORIGIN = 'https://www.arcanakin.com.br';

/**
 * OAuth proxy (login com Google nos previews): o preview manda o login pelo site de produção,
 * que devolve o perfil cifrado para o preview criar a sessão. Só na Vercel; em desenvolvimento
 * (localhost) o login vai direto ao Google. `OAUTH_PROXY_SECRET` (opcional, igual em produção e
 * preview) separa a chave do proxy da `BETTER_AUTH_SECRET`.
 */
export function oauthProxyOptions(env: { VERCEL_ENV?: string; OAUTH_PROXY_SECRET?: string }) {
  if (env.VERCEL_ENV !== 'production' && env.VERCEL_ENV !== 'preview') return null;
  return {
    productionURL: PRODUCTION_ORIGIN,
    ...(env.OAUTH_PROXY_SECRET ? { secret: env.OAUTH_PROXY_SECRET } : {}),
  };
}
