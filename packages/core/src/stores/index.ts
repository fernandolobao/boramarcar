/**
 * Perfis de loja (10.1; desenho em `docs/superpowers/specs/2026-11-18-torneios-e-lojas-design.md`).
 * Regras puras: endereço da página e a limpeza dos contatos que a loja informa.
 */

export const STORE_ROLES = ['owner', 'staff'] as const;
export type StoreRole = (typeof STORE_ROLES)[number];

/** Dias de validade de um convite (dono ou equipe). */
export const STORE_INVITE_DAYS = 14;

/** Endereço da página da loja a partir do nome: minúsculas, sem acento, palavras com hífen. */
/** Endereços de loja que não podem ser usados (`/lojas/em/...` é a descoberta por cidade). */
export const RESERVED_STORE_SLUGS = ['em'] as const;

export function storeSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'loja';
}

/** Instagram como o nome da conta (sem @ nem link); `null` se não for um nome válido. */
export function normalizeInstagram(value: string): string | null {
  const raw = value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '');
  return /^[a-zA-Z0-9._]{1,30}$/.test(raw) ? raw.toLowerCase() : null;
}

/** WhatsApp só com dígitos e DDI (55 quando vier com DDD e número); `null` se não parecer telefone. */
export function normalizeWhatsapp(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

/** Site com http(s) (https quando faltar); `null` se não for um endereço da web. */
export function normalizeWebsite(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Tipo de evento de loja: com torneio (motor do 9.1) ou noite de jogo livre. */
export const STORE_EVENT_KINDS = ['tournament', 'casual'] as const;
export type StoreEventKind = (typeof STORE_EVENT_KINDS)[number];

/** Letras e números do código do evento, sem os que se confundem (0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Código curto do evento, para a pessoa digitar no app quando chega na loja. */
export function eventCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Código digitado: maiúsculas, sem espaços nem hífens; `null` se não tem o tamanho certo. */
export function normalizeEventCode(value: string): string | null {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH ? code : null;
}

export type StoreEntryStatus = 'registered' | 'waitlist';

/** Nova inscrição: vaga enquanto houver (sem limite = sempre), senão lista de espera. */
export function entryStatusFor(registered: number, capacity: number | null): StoreEntryStatus {
  return capacity === null || registered < capacity ? 'registered' : 'waitlist';
}

/**
 * Quem sai da lista de espera quando abrem vagas (alguém desistiu ou a loja aumentou as vagas):
 * os mais antigos da fila, até completar as vagas. Devolve os ids, na ordem.
 */
export function promoteFromWaitlist(
  entries: readonly { id: string; status: StoreEntryStatus; createdAt: Date }[],
  capacity: number | null,
): string[] {
  const registered = entries.filter((e) => e.status === 'registered').length;
  const waiting = entries
    .filter((e) => e.status === 'waitlist')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const free = capacity === null ? waiting.length : Math.max(0, capacity - registered);
  return waiting.slice(0, free).map((e) => e.id);
}
