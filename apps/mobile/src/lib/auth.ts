import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

/**
 * Login (5.2) com o plugin Expo do Better Auth: o Google abre no navegador do sistema e volta
 * para o app por `boramarcar://`; a sessão fica no SecureStore (chaveiro/keystore).
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'boramarcar',
      storagePrefix: 'boramarcar',
      storage: SecureStore,
    }),
  ],
});
