import 'server-only';
import { vercelAdapter } from '@flags-sdk/vercel';
import { dedupe, flag } from 'flags/next';
import { headers } from 'next/headers';
import { getSessionUser } from '@/server/session';

type Entities = { user?: { id: string; email: string } };

/** Quem está vendo (para regras por pessoa no painel da Vercel). Uma vez por requisição. */
const identify = dedupe(async (): Promise<Entities> => {
  const user = await getSessionUser(await headers()).catch(() => null);
  return user ? { user: { id: user.id, email: user.email } } : {};
});

/**
 * Flag `print-proxy` (Vercel Flags): libera a impressão de proxies. Desligada por padrão — se o
 * serviço não responder, ninguém imprime.
 */
export const printProxyFlag = flag<boolean, Entities>({
  key: 'print-proxy',
  description: 'Impressão de proxies (página de impressão e PDF)',
  adapter: vercelAdapter(),
  identify,
  defaultValue: false,
});
