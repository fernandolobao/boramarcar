export type DomainErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'unauthorized'
  | 'upstream_error'
  | 'rate_limited';

/**
 * Erro de domínio com um código estável. A camada HTTP traduz o código para status
 * e a interface traduz para uma mensagem no idioma do usuário.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: unknown;

  constructor(code: DomainErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
