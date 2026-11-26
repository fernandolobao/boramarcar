import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_KINDS,
  ACTIVITY_RETENTION_DAYS,
  activityBucket,
  activitySince,
  isActivityKind,
  loginPlatform,
} from './index';

describe('registro de atividade (Admin)', () => {
  it('agrupa por hora cheia (UTC): 10h05 e 10h59 caem na mesma linha', () => {
    expect(activityBucket(new Date('2026-11-26T10:05:12Z')).toISOString()).toBe(
      '2026-11-26T10:00:00.000Z',
    );
    expect(activityBucket(new Date('2026-11-26T10:59:59.999Z')).toISOString()).toBe(
      '2026-11-26T10:00:00.000Z',
    );
    expect(activityBucket(new Date('2026-11-26T11:00:00Z')).toISOString()).toBe(
      '2026-11-26T11:00:00.000Z',
    );
  });

  it('períodos do filtro e retenção de 90 dias', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    expect(activitySince(now, '24h').toISOString()).toBe('2026-11-25T12:00:00.000Z');
    expect(activitySince(now, '7d').toISOString()).toBe('2026-11-19T12:00:00.000Z');
    expect(activitySince(now, '90d').toISOString()).toBe('2026-08-28T12:00:00.000Z');
    expect(ACTIVITY_RETENTION_DAYS).toBe(90);
  });

  it('tipos conhecidos', () => {
    expect(ACTIVITY_KINDS).toContain('login');
    expect(ACTIVITY_KINDS).toContain('collection_added');
    expect(isActivityKind('deck_updated')).toBe(true);
    expect(isActivityKind('nada')).toBe(false);
  });
});

describe('entrada pelo site ou pelo app', () => {
  it('reconhece o app (Expo, Android e iOS) e o resto é site', () => {
    expect(loginPlatform('Expo/2.32 CFNetwork/1568 Darwin/24.0')).toBe('app');
    expect(loginPlatform('okhttp/4.12.0')).toBe('app');
    expect(
      loginPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'),
    ).toBe('site');
    expect(loginPlatform(null)).toBe('site');
  });
});
