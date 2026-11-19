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
