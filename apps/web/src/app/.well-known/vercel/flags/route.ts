import { getProviderData } from '@flags-sdk/vercel';
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import * as flags from '@/flags';

/** Flags Explorer (barra da Vercel): lista as flags declaradas em `src/flags.ts`. */
export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
