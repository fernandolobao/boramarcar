/** Servidor do Bora Marcar (API e login). Em desenvolvimento: `EXPO_PUBLIC_API_URL=http://<ip>:3000`. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://boramarcar.vercel.app').replace(
  /\/+$/,
  '',
);
