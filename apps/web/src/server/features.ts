import 'server-only';
import { listGroupsForUser } from '@boramarcar/db';
import { getActiveGroup } from './active-group';
import { getDb } from './db';

/** Nomes de grupo comparados sem diferença de maiúsculas, acentos e espaços nas pontas. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * Flag por grupo: na Vercel, a flag do painel (regras por pessoa ou nome do grupo). Fora da
 * Vercel (dev, testes, E2E), a lista de nomes de grupo vem de uma variável de ambiente
 * (separados por vírgula; `*` libera todos).
 */
async function groupFlag(
  user: { id: string },
  env: string,
  vercel: () => Promise<boolean>,
): Promise<boolean> {
  if (process.env.VERCEL) return vercel().catch(() => false);
  const list = (process.env[env] ?? '').split(',').map(norm).filter(Boolean);
  if (!list.length) return false;
  if (list.includes('*')) return true;
  // Sem requisição (testes), o primeiro grupo da pessoa.
  const active = await getActiveGroup(user.id)
    .then((g) => g.active)
    .catch(async () => (await listGroupsForUser(getDb(), user.id))[0] ?? null);
  return active ? list.includes(norm(active.name)) : false;
}

/** Leitura de cartas pela câmera: flag `card-scanner` (fora da Vercel, `FLAG_CARD_SCANNER_GROUPS`). */
export const canScanCards = (user: { id: string }) =>
  groupFlag(user, 'FLAG_CARD_SCANNER_GROUPS', async () =>
    (await import('@/flags')).cardScannerFlag(),
  );

/**
 * Modo mesa, cor da área de cada jogador (futuro pacote pago): flag `table-colors` (fora da
 * Vercel, `FLAG_TABLE_COLORS_GROUPS`).
 */
export const canChooseTableColors = (user: { id: string }) =>
  groupFlag(user, 'FLAG_TABLE_COLORS_GROUPS', async () =>
    (await import('@/flags')).tableColorsFlag(),
  );
