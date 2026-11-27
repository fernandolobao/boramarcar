import 'server-only';
import { vercelAdapter } from '@flags-sdk/vercel';
import { dedupe, flag } from 'flags/next';
import { headers } from 'next/headers';
import { getActiveGroup } from '@/server/active-group';
import { getSessionUser } from '@/server/session';

/**
 * Quem está vendo, para as regras das flags no painel da Vercel (Flags → Entities): a pessoa
 * (só o id) e o grupo ativo (id e nome). Nada de e-mail: o nome do grupo basta para as regras.
 * Uma vez por requisição.
 */
export type FlagEntities = {
  user?: { id: string };
  group?: { id: string; name: string };
};

const identify = dedupe(async (): Promise<FlagEntities> => {
  const user = await getSessionUser(await headers()).catch(() => null);
  if (!user) return {};
  const { active } = await getActiveGroup(user.id).catch(() => ({ active: null }));
  return {
    user: { id: user.id },
    ...(active ? { group: { id: active.id, name: active.name } } : {}),
  };
});

/**
 * `card-scanner` (Vercel Flags): leitura de cartas pela câmera. Desligada por padrão; no painel,
 * a regra libera os grupos da lista ("group.name é um destes: …"). Se o serviço não responder,
 * ninguém vê.
 */
export const cardScannerFlag = flag<boolean, FlagEntities>({
  key: 'card-scanner',
  description: 'Leitura de cartas pela câmera (coleção e deck), por grupo',
  adapter: vercelAdapter,
  identify,
  defaultValue: false,
  options: [
    { value: false, label: 'Desligada' },
    { value: true, label: 'Ligada' },
  ],
});

/**
 * `table-colors` (Vercel Flags): escolher a cor da área no modo mesa (futuro pacote pago, 13.3).
 * Desligada por padrão; no painel, a regra libera pessoas ou grupos. Se o serviço não responder,
 * ninguém vê.
 */
export const tableColorsFlag = flag<boolean, FlagEntities>({
  key: 'table-colors',
  description: 'Modo mesa: escolher a cor da área de cada jogador (futuro pacote pago)',
  adapter: vercelAdapter,
  identify,
  defaultValue: false,
  options: [
    { value: false, label: 'Desligada' },
    { value: true, label: 'Ligada' },
  ],
});
