import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value ?? '';

describe('cabeçalhos de segurança', () => {
  it('"Usar minha localização" (busca de lojas) pode pedir a posição: geolocalização só para o próprio site', () => {
    expect(header('Permissions-Policy')).toContain('geolocation=(self)');
    expect(header('Permissions-Policy')).toContain('camera=(self)');
  });

  it('o resto continua: nosniff, referrer e HSTS', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Strict-Transport-Security')).toContain('max-age=63072000');
  });

  it('a página não pode ser posta num iframe de outro site nem dividir a janela com ele', () => {
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });
});
