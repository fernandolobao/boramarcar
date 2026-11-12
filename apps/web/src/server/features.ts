import 'server-only';
import { isAdmin } from './admin';

/**
 * Impressão de proxies: só com a flag `print-proxy` ligada **e** para quem está em
 * `ADMIN_EMAILS`. Fora da Vercel (desenvolvimento, testes, E2E) a flag vem de
 * `FLAG_PRINT_PROXY=true`.
 */
export async function canPrintProxies(user: { email: string }) {
  if (!isAdmin(user.email)) return false;
  if (!process.env.VERCEL) return process.env.FLAG_PRINT_PROXY === 'true';
  const { printProxyFlag } = await import('@/flags');
  return printProxyFlag();
}
