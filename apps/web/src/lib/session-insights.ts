/** Tag do Contentsquare (Hotjar) da ArcanaKin. O id é público: aparece no HTML de qualquer forma. */
export const CONTENTSQUARE_TAG_ID = '15a7daef5cfb7';

/** URL da tag; só aceita ids no formato do Contentsquare (hexadecimal). */
export function contentsquareTagUrl(tagId: string): string | null {
  return /^[0-9a-f]{8,20}$/i.test(tagId) ? `https://t.contentsquare.net/uxa/${tagId}.js` : null;
}

/** Só grava sessões em produção (nada de testes E2E, previews da Vercel nem desenvolvimento). */
export function sessionInsightsEnabled(env: Record<string, string | undefined> = process.env) {
  if (env.NEXT_PUBLIC_SESSION_INSIGHTS === 'off') return false;
  return env.VERCEL_ENV === 'production';
}
