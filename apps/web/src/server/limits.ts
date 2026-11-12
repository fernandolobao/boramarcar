import 'server-only';
import { consumeRateLimit, type Database } from '@boramarcar/db';

const MINUTE = 60_000;

/**
 * Limites de uso por pessoa nas rotas que chamam serviços externos (Scryfall, Archidekt,
 * Moxfield, Commander Spellbook, Photon) e nas que mexem com convites e grupos. Folgados para o uso normal; servem para um script ou
 * um clique repetido não esgotarem a cota de ninguém. Acima do limite: 429 com `Retry-After`.
 */
export const RATE_LIMITS = {
  /** Importar deck por URL ou texto. */
  import: { limit: 10, windowMs: 10 * MINUTE },
  /** Atualizar deck pela origem. */
  sync: { limit: 10, windowMs: 10 * MINUTE },
  /** Atualizar a análise (Tagger + Spellbook). */
  analysis: { limit: 20, windowMs: 10 * MINUTE },
  /** Buscas pequenas: autocompletar, edições, alternativas, endereços, adicionar carta. */
  search: { limit: 120, windowMs: MINUTE },
  /** Entrar por convite: também impede tentar códigos no chute. */
  join: { limit: 20, windowMs: 10 * MINUTE },
  /** Criar grupo e trocar o código de convite. */
  groups: { limit: 20, windowMs: 60 * MINUTE },
  /** Relatórios de CSP (sem login): por endereço, para ninguém encher o log. */
  cspReport: { limit: 60, windowMs: MINUTE },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export const rateLimit = (db: Database, userId: string, kind: RateLimitKind) =>
  consumeRateLimit(db, `${kind}:${userId}`, RATE_LIMITS[kind]);

/**
 * Chave de limite para rotas sem login: o endereço de quem chamou (primeiro do
 * `x-forwarded-for`, posto pela Vercel), guardado só como hash — o IP em si não vai para o banco.
 */
export async function clientKey(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'desconhecido';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Cache no CDN da Vercel para respostas iguais para todo mundo (dados públicos de cartas): a
 * mesma busca vira uma chamada só por dia, para todos, e nem chega a rodar a função. O navegador
 * guarda por 1 h.
 */
export const PUBLIC_CDN_CACHE = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};
