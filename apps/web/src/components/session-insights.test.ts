import { describe, expect, it } from 'vitest';
import {
  CONTENTSQUARE_TAG_ID,
  contentsquareTagUrl,
  sessionInsightsEnabled,
} from './session-insights';

describe('SessionInsights (Hotjar/Contentsquare)', () => {
  it('monta a URL da tag só com ids válidos', () => {
    expect(contentsquareTagUrl(CONTENTSQUARE_TAG_ID)).toBe(
      'https://t.contentsquare.net/uxa/15a7daef5cfb7.js',
    );
    expect(contentsquareTagUrl('abc"><script>')).toBeNull();
    expect(contentsquareTagUrl('')).toBeNull();
  });

  it('só liga em produção na Vercel, e dá para desligar', () => {
    expect(sessionInsightsEnabled({ VERCEL_ENV: 'production' })).toBe(true);
    expect(sessionInsightsEnabled({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(sessionInsightsEnabled({})).toBe(false);
    expect(
      sessionInsightsEnabled({ VERCEL_ENV: 'production', NEXT_PUBLIC_SESSION_INSIGHTS: 'off' }),
    ).toBe(false);
  });
});
