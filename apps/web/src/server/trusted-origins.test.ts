// O mesmo verificador que o Better Auth usa (interno, sem tipos e sem export no pacote).
// @ts-expect-error -- módulo interno sem declaração de tipos
import { matchesOriginPattern as match } from '../../node_modules/better-auth/dist/auth/trusted-origins.mjs';
import { describe, expect, it } from 'vitest';
import { authTrustedOrigins, oauthProxyOptions } from './trusted-origins';

const matchesOriginPattern = match as (url: string, pattern: string) => boolean;
const allowed = (url: string, origins: string[]) =>
  origins.some((pattern) => matchesOriginPattern(url, pattern));

describe('origens confiáveis do login', () => {
  it('produção: só o app, a não ser que o Expo Go na rede local seja liberado', () => {
    const prod = authTrustedOrigins({ NODE_ENV: 'production' });
    expect(allowed('arcanakin:///', prod)).toBe(true);
    // Esquema anterior ao rebranding, aceito por um tempo.
    expect(allowed('boramarcar:///', prod)).toBe(true);
    expect(allowed('outroapp:///', prod)).toBe(false);
    expect(allowed('exp://192.168.0.12:8081/--/', prod)).toBe(false);

    const lan = authTrustedOrigins({ NODE_ENV: 'production', EXPO_GO_LOGIN: 'lan' });
    expect(allowed('exp://192.168.0.12:8081/--/', lan)).toBe(true);
    expect(allowed('exp://10.0.0.5:8081/--/', lan)).toBe(true);
    expect(allowed('exp://172.20.1.2:8081/--/', lan)).toBe(true);
    expect(allowed('exp://172.40.1.2:8081/--/', lan)).toBe(false);
    expect(allowed('exp://8.8.8.8:8081/--/', lan)).toBe(false);
    expect(allowed('exp://u.expo.dev/abc', lan)).toBe(false);
  });

  it('desenvolvimento: qualquer Expo Go', () => {
    expect(allowed('exp://u.expo.dev/abc', authTrustedOrigins({ NODE_ENV: 'development' }))).toBe(
      true,
    );
  });

  it('na Vercel: só os previews deste projeto, nesta conta', () => {
    for (const VERCEL_ENV of ['production', 'preview']) {
      const origins = authTrustedOrigins({ NODE_ENV: 'production', VERCEL_ENV });
      expect(
        allowed(
          'https://boramarcar-git-fix-deck-foil-parcial-fernandolobaos-projects.vercel.app',
          origins,
        ),
      ).toBe(true);
      expect(
        allowed('https://boramarcar-a1b2c3d4e-fernandolobaos-projects.vercel.app', origins),
      ).toBe(true);
      // Outro projeto ou outra conta na Vercel não.
      expect(allowed('https://boramarcar-evil.vercel.app', origins)).toBe(false);
      expect(allowed('https://outro-git-x-fernandolobaos-projects.vercel.app', origins)).toBe(
        false,
      );
      expect(allowed('https://boramarcar-x-outra-conta.vercel.app', origins)).toBe(false);
    }
    // Fora da Vercel (ex.: E2E, outra hospedagem): nada de previews.
    expect(
      allowed(
        'https://boramarcar-a1b2c3d4e-fernandolobaos-projects.vercel.app',
        authTrustedOrigins({ NODE_ENV: 'production' }),
      ),
    ).toBe(false);
  });

  it('OAuth proxy só na Vercel, com a URL de produção e segredo próprio opcional', () => {
    expect(oauthProxyOptions({})).toBeNull();
    expect(oauthProxyOptions({ VERCEL_ENV: 'development' })).toBeNull();
    expect(oauthProxyOptions({ VERCEL_ENV: 'preview' })).toEqual({
      productionURL: 'https://www.arcanakin.com.br',
    });
    expect(oauthProxyOptions({ VERCEL_ENV: 'production', OAUTH_PROXY_SECRET: 's' })).toEqual({
      productionURL: 'https://www.arcanakin.com.br',
      secret: 's',
    });
  });
});
