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
 * Leitura de cartas pela câmera: na Vercel, a flag `card-scanner` (regra por nome do grupo no
 * painel). Fora da Vercel (dev, testes, E2E), a lista vem de `FLAG_CARD_SCANNER_GROUPS`
 * (nomes separados por vírgula; `*` libera todos).
 */
export async function canScanCards(user: { id: string }): Promise<boolean> {
  if (process.env.VERCEL) {
    const { cardScannerFlag } = await import('@/flags');
    return cardScannerFlag().catch(() => false);
  }
  const list = (process.env.FLAG_CARD_SCANNER_GROUPS ?? '').split(',').map(norm).filter(Boolean);
  if (!list.length) return false;
  if (list.includes('*')) return true;
  // Sem requisição (testes), o primeiro grupo da pessoa.
  const active = await getActiveGroup(user.id)
    .then((g) => g.active)
    .catch(async () => (await listGroupsForUser(getDb(), user.id))[0] ?? null);
  return active ? list.includes(norm(active.name)) : false;
}
