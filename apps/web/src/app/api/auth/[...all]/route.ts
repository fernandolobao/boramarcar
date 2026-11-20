import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/server/auth';
import { withAuthGuard } from '@/server/auth-guard';

// A guarda recusa destinos em previews da Vercel que não são deste projeto (ver auth-guard.ts).
export const GET = withAuthGuard((req) => toNextJsHandler(getAuth()).GET(req));
export const POST = withAuthGuard((req) => toNextJsHandler(getAuth()).POST(req));
