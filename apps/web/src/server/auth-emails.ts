import 'server-only';
import { buildAccountEmail, deliverEmails } from './email';

type AuthUser = { name: string; email: string; locale?: string | null };

/**
 * Envio dos e-mails da conta (Better Auth). Sem `await` no envio: o Better Auth recomenda não
 * esperar (evita revelar pelo tempo de resposta se o e-mail existe); falhas vão para o log.
 */
function send(user: AuthUser, kind: 'verify' | 'reset', url: string) {
  void deliverEmails([
    buildAccountEmail(
      { name: user.name, email: user.email, locale: user.locale ?? null },
      { kind, url },
    ),
  ]).catch((error: unknown) => console.error(`[auth] e-mail (${kind}) não enviado`, error));
}

export const sendVerificationEmail = ({ user, url }: { user: AuthUser; url: string }) =>
  Promise.resolve(send(user, 'verify', url));

export const sendResetPasswordEmail = ({ user, url }: { user: AuthUser; url: string }) =>
  Promise.resolve(send(user, 'reset', url));
