import { createApiClient } from '@boramarcar/api-client';
import { authClient } from './auth';
import { API_URL } from './config';

/** Cliente da API (5.3) com o cookie da sessão em cada pedido. */
export const api = createApiClient({
  baseUrl: API_URL,
  getHeaders: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    return cookie ? { Cookie: cookie } : {};
  },
});
