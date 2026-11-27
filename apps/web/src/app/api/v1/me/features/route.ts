import { authed } from '@/server/http';
import { canChooseTableColors, canScanCards } from '@/server/features';

/**
 * Recursos liberados por flag para quem está logado (o app não avalia as flags da Vercel: pergunta
 * aqui). Só booleanos, sem dados de quem decide.
 */
export const GET = authed(async ({ user }) => {
  const [cardScanner, tableColors] = await Promise.all([
    canScanCards(user),
    canChooseTableColors(user),
  ]);
  return { cardScanner, tableColors };
});
