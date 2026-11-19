import { describe, expect, it } from 'vitest';
import { normalizeInstagram, normalizeWebsite, normalizeWhatsapp, storeSlug } from './index';

describe('perfil de loja', () => {
  it('endereço da página a partir do nome: minúsculas, sem acento, hífens', () => {
    expect(storeSlug('Loja do Mago — Centro')).toBe('loja-do-mago-centro');
    expect(storeSlug('  Ação & Cartas!! ')).toBe('acao-cartas');
    expect(storeSlug('###')).toBe('loja');
    expect(storeSlug('a'.repeat(80)).length).toBeLessThanOrEqual(48);
  });

  it('Instagram: aceita @nome, nome ou o link; recusa o resto', () => {
    expect(normalizeInstagram('@lojadomago')).toBe('lojadomago');
    expect(normalizeInstagram('https://www.instagram.com/loja.do_mago/')).toBe('loja.do_mago');
    expect(normalizeInstagram('loja do mago')).toBeNull();
    expect(normalizeInstagram('')).toBeNull();
  });

  it('WhatsApp: só dígitos, com DDI 55 quando vier só com DDD', () => {
    expect(normalizeWhatsapp('(51) 99999-1234')).toBe('5551999991234');
    expect(normalizeWhatsapp('+55 51 99999-1234')).toBe('5551999991234');
    expect(normalizeWhatsapp('1234')).toBeNull();
  });

  it('site: só http(s), com https quando faltar', () => {
    expect(normalizeWebsite('lojadomago.com.br')).toBe('https://lojadomago.com.br/');
    expect(normalizeWebsite('http://lojadomago.com.br/eventos')).toBe(
      'http://lojadomago.com.br/eventos',
    );
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite('não é site')).toBeNull();
  });
});

describe('eventos de loja (10.2)', () => {
  it('código do evento: 6 caracteres sem letras que se confundem', async () => {
    const { eventCode, normalizeEventCode } = await import('./index');
    let seed = 0;
    const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const code = eventCode(random);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(normalizeEventCode(' ab-c 23z ')).toBe('ABC23Z');
    expect(normalizeEventCode('ab')).toBeNull();
  });

  it('vaga ou lista de espera, e quem sobe quando alguém desiste', async () => {
    const { entryStatusFor, promoteFromWaitlist } = await import('./index');
    expect(entryStatusFor(3, 4)).toBe('registered');
    expect(entryStatusFor(4, 4)).toBe('waitlist');
    expect(entryStatusFor(100, null)).toBe('registered');
    const entries = [
      { id: 'a', status: 'registered' as const, createdAt: new Date('2026-11-01') },
      { id: 'w2', status: 'waitlist' as const, createdAt: new Date('2026-11-03') },
      { id: 'w1', status: 'waitlist' as const, createdAt: new Date('2026-11-02') },
    ];
    // Vaga livre (capacidade 2, 1 inscrito): sobe o primeiro da fila (o mais antigo).
    expect(promoteFromWaitlist(entries, 2)).toEqual(['w1']);
    expect(promoteFromWaitlist(entries, 3)).toEqual(['w1', 'w2']);
    expect(promoteFromWaitlist(entries, 1)).toEqual([]);
    expect(promoteFromWaitlist(entries, null)).toEqual(['w1', 'w2']);
  });
});
