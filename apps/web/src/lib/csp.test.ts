import { describe, expect, it } from 'vitest';
import { buildCsp, CSP_REPORT_PATH, nonce } from './csp';

const directive = (policy: string, name: string) =>
  policy
    .split('; ')
    .find((d) => d.startsWith(`${name} `) || d === name)
    ?.split(' ')
    .slice(1);

describe('buildCsp', () => {
  const { enforced, reportOnly } = buildCsp({ nonce: 'abc123' });

  it('scripts só com o nonce (strict-dynamic), sem eval em produção', () => {
    const scripts = directive(enforced, 'script-src')!;
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('bloqueia object, base de fora, iframe alheio e formulários para outros sites', () => {
    expect(directive(enforced, 'object-src')).toEqual(["'none'"]);
    expect(directive(enforced, 'base-uri')).toEqual(["'self'"]);
    expect(directive(enforced, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(enforced, 'form-action')).toEqual(["'self'"]);
    expect(directive(enforced, 'upgrade-insecure-requests')).toEqual([]);
  });

  it('a política relatada tem a lista exata de conexões e manda relatórios', () => {
    expect(directive(reportOnly, 'connect-src')).not.toContain('https:');
    expect(directive(reportOnly, 'connect-src')).toContain("'self'");
    expect(directive(reportOnly, 'report-uri')).toEqual([CSP_REPORT_PATH]);
  });

  it('em desenvolvimento libera eval e websocket (recarregar ao salvar)', () => {
    const dev = buildCsp({ nonce: 'x', dev: true });
    expect(directive(dev.enforced, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev.enforced, 'connect-src')).toContain('ws:');
    expect(directive(dev.enforced, 'upgrade-insecure-requests')).toBeUndefined();
  });
});

describe('nonce', () => {
  it('é novo a cada chamada e em base64', () => {
    const a = nonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(nonce()).not.toBe(a);
  });
});
