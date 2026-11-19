/**
 * Perfis de loja (10.1; desenho em `docs/superpowers/specs/2026-11-18-torneios-e-lojas-design.md`).
 * Regras puras: endereço da página e a limpeza dos contatos que a loja informa.
 */

export const STORE_ROLES = ['owner', 'staff'] as const;
export type StoreRole = (typeof STORE_ROLES)[number];

/** Dias de validade de um convite (dono ou equipe). */
export const STORE_INVITE_DAYS = 14;

/** Endereço da página da loja a partir do nome: minúsculas, sem acento, palavras com hífen. */
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
