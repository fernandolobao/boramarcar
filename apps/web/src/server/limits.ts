import 'server-only';
import { consumeRateLimit, type Database } from '@boramarcar/db';

const MINUTE = 60_000;

/**
 * Limites de uso por pessoa nas rotas que chamam serviços externos (Scryfall, Archidekt,
 * Moxfield, Commander Spellbook, Photon). Folgados para o uso normal; servem para um script ou
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
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export const rateLimit = (db: Database, userId: string, kind: RateLimitKind) =>
  consumeRateLimit(db, `${kind}:${userId}`, RATE_LIMITS[kind]);

/**
 * Cache no CDN da Vercel para respostas iguais para todo mundo (dados públicos de cartas): a
 * mesma busca vira uma chamada só por dia, para todos, e nem chega a rodar a função. O navegador
 * guarda por 1 h.
 */
export const PUBLIC_CDN_CACHE = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};
