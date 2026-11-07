// O mesmo verificador que o Better Auth usa (interno, sem tipos e sem export no pacote).
// @ts-expect-error -- módulo interno sem declaração de tipos
import { matchesOriginPattern as match } from '../../node_modules/better-auth/dist/auth/trusted-origins.mjs';
import { describe, expect, it } from 'vitest';
import { authTrustedOrigins } from './trusted-origins';

const matchesOriginPattern = match as (url: string, pattern: string) => boolean;
const allowed = (url: string, origins: string[]) =>
  origins.some((pattern) => matchesOriginPattern(url, pattern));

describe('origens confiáveis do login', () => {
  it('produção: só o app, a não ser que o Expo Go na rede local seja liberado', () => {
    const prod = authTrustedOrigins({ NODE_ENV: 'production' });
    expect(allowed('boramarcar:///', prod)).toBe(true);
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
});
