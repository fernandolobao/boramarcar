import { updateUserImage, type Database } from '@boramarcar/db';

/**
 * Foto do Google no avatar (claim `picture` do OpenID Connect, escopo `profile`).
 *
 * O Better Auth já grava `picture` em `user.image` ao **criar** o usuário. Em logins seguintes ele
 * não atualiza nada por padrão, e ligar `overrideUserInfoOnSignIn` também sobrescreveria nome e
 * e-mail (e poderia gravar uma foto vazia). Por isso, depois de cada login com o Google, lemos só a
 * claim `picture` do ID token recém-recebido e atualizamos só a foto, e só quando ela é uma URL
 * válida. O ID token vem direto do endpoint de token do Google (HTTPS + client secret), que é o
 * caso em que a documentação do Google dispensa validar a assinatura de novo.
 *
 * A URL da foto pode mudar a qualquer momento e nunca é usada para identificar o usuário (quem
 * identifica é o `sub`, guardado pelo Better Auth em `account.accountId`).
 */

/**
 * Opções do provedor Google: só os escopos do OpenID Connect necessários para entrar — identidade
 * (`openid`), e-mail (`email`) e nome e foto (`profile`). Nada de Gmail, Drive ou outros.
 */
export const GOOGLE_SIGN_IN_OPTIONS = {
  prompt: 'select_account',
  disableDefaultScope: true,
  scope: ['openid', 'email', 'profile'],
} as const;

/** Lê a claim `picture` do payload de um JWT (sem validar: ver acima). */
export function pictureFromIdToken(idToken: string | null | undefined): string | null {
  const payload = idToken?.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown;
    const picture = (json as { picture?: unknown } | null)?.picture;
    return typeof picture === 'string' ? picture : null;
  } catch {
    return null;
  }
}

/** URL de foto aceitável: `https`, com host, até 2.048 caracteres. Senão, `null`. */
export function validProfileImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Depois de criar ou atualizar a conta do Google no login: grava a foto atual do Google no
 * usuário, se houver uma URL válida. Sem foto (ou foto inválida), a imagem existente fica como
 * está — nunca é trocada por `null` ou vazio.
 */
export async function syncGoogleProfileImage(
  db: Database,
  account: { providerId?: string | null; userId?: string | null; idToken?: string | null },
): Promise<boolean> {
  if (account.providerId !== 'google' || !account.userId) return false;
  const image = validProfileImageUrl(pictureFromIdToken(account.idToken));
  if (!image) return false;
  return updateUserImage(db, { userId: account.userId, image });
}
