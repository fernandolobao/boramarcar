/** Site em produção (API e login). */
export const PRODUCTION_URL = 'https://boramarcar-zeta.vercel.app';

/**
 * Servidor do ArcanaKin (API e login): a produção, ou `EXPO_PUBLIC_API_URL` para outro
 * (ex.: um túnel https para o `pnpm dev`; o Google não aceita voltar para um IP da rede local).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || PRODUCTION_URL).replace(
  /\/+$/,
  '',
);

/** Tempo máximo de cada pedido ao servidor antes de mostrar o erro de conexão. */
export const REQUEST_TIMEOUT_MS = 15_000;
