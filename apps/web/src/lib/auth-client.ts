'use client';

import { createAuthClient } from 'better-auth/react';

/** Cliente do Better Auth para componentes de navegador (mesma origem do app). */
export const authClient = createAuthClient();
