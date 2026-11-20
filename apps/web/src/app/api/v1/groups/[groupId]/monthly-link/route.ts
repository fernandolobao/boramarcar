import { DomainError } from '@boramarcar/core';
import { requireMembership } from '@boramarcar/db';
import { authed } from '@/server/http';
import { monthlyUrl } from '@/server/monthly-link';

/**
 * Endereço da retrospectiva do mês com o código de acesso (8.12), para quem é do grupo. O app abre
 * a página no navegador, que não tem a sessão do app: o código deixa a página abrir.
 */
export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  await requireMembership(db, params.groupId, user.id);
  const month = new URL(req.url).searchParams.get('month') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new DomainError('invalid_input', 'Mês inválido (use AAAA-MM)');
  }
  return { url: monthlyUrl(params.groupId, month) };
});
