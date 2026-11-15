import { describe, expect, it } from 'vitest';
import { partnerHints } from './partners';

const now = new Date('2026-11-15T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600_000);
const members = ['me', 'ana', 'bia', 'caio', 'duda', 'edu'].map((userId) => ({
  userId,
  name: userId[0]!.toUpperCase() + userId.slice(1),
}));

describe('partnerHints', () => {
  it('quem confirmou o próximo vem primeiro, depois quem nunca jogou, depois o mais antigo', () => {
    const hints = partnerHints({
      viewerId: 'me',
      members,
      lastPlayed: { ana: daysAgo(200), bia: null, caio: daysAgo(40), duda: daysAgo(10), edu: null },
      confirmedNext: ['caio'],
      now,
    });
    expect(hints.map((h) => h.userId)).toEqual(['caio', 'bia', 'edu']);
    expect(hints[0]!.lastPlayedAt).toEqual(daysAgo(40));
    expect(hints[1]!.lastPlayedAt).toBeNull();
  });

  it('deixa de fora quem jogou com você há menos de 30 dias e você mesmo', () => {
    const hints = partnerHints({
      viewerId: 'me',
      members,
      lastPlayed: {
        ana: daysAgo(29),
        bia: daysAgo(1),
        caio: daysAgo(5),
        duda: daysAgo(2),
        edu: daysAgo(31),
      },
      confirmedNext: ['me'],
      now,
    });
    expect(hints.map((h) => h.userId)).toEqual(['edu']);
  });

  it('no máximo 3, e o mais antigo antes entre quem já jogou', () => {
    const hints = partnerHints({
      viewerId: 'me',
      members,
      lastPlayed: {
        ana: daysAgo(40),
        bia: daysAgo(90),
        caio: daysAgo(60),
        duda: daysAgo(300),
        edu: daysAgo(35),
      },
      confirmedNext: [],
      now,
    });
    expect(hints.map((h) => h.userId)).toEqual(['duda', 'bia', 'caio']);
  });
});
