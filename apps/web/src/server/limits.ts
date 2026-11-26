import 'server-only';
import { createHmac } from 'node:crypto';
import { consumeRateLimit, type Database } from '@boramarcar/db';
import { getEnv } from '@/env';

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
  /** Leitura de carta pela câmera: cada leitura faz algumas buscas no Scryfall. */
  scan: { limit: 40, windowMs: MINUTE },
  /** Entrar por convite: também impede tentar códigos no chute. */
  join: { limit: 20, windowMs: 10 * MINUTE },
  /** Criar grupo e trocar o código de convite. */
  groups: { limit: 20, windowMs: 60 * MINUTE },
  /** Relatórios de CSP (sem login): por endereço, para ninguém encher o log. */
  cspReport: { limit: 60, windowMs: MINUTE },
  /** Feedback do beta. */
  feedback: { limit: 10, windowMs: 60 * MINUTE },
  /** Código do balcão dos eventos de loja: tentativas, para o código não ser adivinhado. */
  storeCode: { limit: 20, windowMs: 10 * MINUTE },
  /** Descoberta de lojas e eventos (10.3), aberta, por endereço. */
  discovery: { limit: 60, windowMs: MINUTE },
  /** PDF de proxies (baixa as imagens de todas as cartas do deck). */
  proxies: { limit: 20, windowMs: 60 * MINUTE },
  /** Envio de foto do perfil e logo da loja. */
  upload: { limit: 20, windowMs: 60 * MINUTE },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export const rateLimit = (db: Database, userId: string, kind: RateLimitKind) =>
  consumeRateLimit(db, `${kind}:${userId}`, RATE_LIMITS[kind]);

/**
 * Chave de limite para rotas sem login: o endereço de quem chamou (primeiro do
 * `x-forwarded-for`, posto pela Vercel), guardado só como HMAC com o segredo do servidor — o IP
 * não vai para o banco, e sem o segredo não dá para testar os 4 bilhões de IPv4 e voltar ao IP.
 */
export async function clientKey(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'desconhecido';
  return hashedKey(ip);
}

/** HMAC-SHA256 truncado (24 hex) de um texto que identifica alguém (IP, chave de login). */
export function hashedKey(value: string) {
  return createHmac('sha256', getEnv().BETTER_AUTH_SECRET)
    .update(`limite:${value}`)
    .digest('hex')
    .slice(0, 24);
}

/**
 * Cache no CDN da Vercel para respostas iguais para todo mundo (dados públicos de cartas): a
 * mesma busca vira uma chamada só por dia, para todos, e nem chega a rodar a função. O navegador
 * guarda por 1 h.
 */
export const PUBLIC_CDN_CACHE = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};
