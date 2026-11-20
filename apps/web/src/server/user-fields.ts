/**
 * O que o login (Better Auth) pode gravar na conta. O cadastro aceita `name` e `image` livres do
 * corpo da requisição; aqui o nome é limpo e só fica foto do Google (a foto enviada pela pessoa vem
 * por `/api/v1/me/avatar`, que passa pelo tratamento da imagem).
 */

/** Tamanho máximo do nome exibido (aparece em grupos, e-mails e push de outras pessoas). */
export const USER_NAME_MAX = 80;

/** Nome sem caracteres de controle, sem espaços nas pontas e com no máximo 80 caracteres. */
export function cleanUserName(value: unknown): string {
  const text = typeof value === 'string' ? value : '';
  return Array.from(
    text
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, USER_NAME_MAX)
    .join('')
    .trim();
}

/** Foto aceita no cadastro: só a do Google (`*.googleusercontent.com`, https). Senão, nenhuma. */
export function allowedSignUpImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.googleusercontent.com')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
