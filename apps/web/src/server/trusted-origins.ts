/** Expo Go numa rede local (IP privado): `exp://192.168.x.x:8081/--/…` e semelhantes. */
const EXPO_GO_LAN = [
  'exp://192.168.*.*:*/**',
  'exp://10.*.*.*:*/**',
  ...Array.from({ length: 16 }, (_, i) => `exp://172.${16 + i}.*.*:*/**`),
];

/**
 * Para onde o login social pode voltar além do próprio site:
 * - o app instalado (`boramarcar://`);
 * - o Expo Go: em desenvolvimento, qualquer `exp://`; em produção só com `EXPO_GO_LOGIN=lan`
 *   (para testar o app sem build próprio) e só em IP de rede local — um link `exp://` público
 *   (túnel) poderia entregar a sessão a outro projeto.
 */
export function authTrustedOrigins(env: { NODE_ENV?: string; EXPO_GO_LOGIN?: string }) {
  if (env.NODE_ENV === 'development') return ['boramarcar://', 'exp://', 'exp://**'];
  return ['boramarcar://', ...(env.EXPO_GO_LOGIN === 'lan' ? EXPO_GO_LAN : [])];
}
