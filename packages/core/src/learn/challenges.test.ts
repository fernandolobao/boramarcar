import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_IDS,
  CHALLENGES,
  challengeIdsOf,
  challengeLevel,
  isChallengeId,
} from './challenges';
import { isLessonId, LEARN_TRACKS, LESSON_IDS } from './index';

describe('desafios guiados (12.4)', () => {
  it('na ordem de CHALLENGE_IDS, com lição que existe e ids que não colidem com as lições', () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual([...CHALLENGE_IDS]);
    for (const c of CHALLENGES) expect(isLessonId(c.lesson)).toBe(true);
    for (const id of CHALLENGE_IDS)
      expect((LESSON_IDS as readonly string[]).includes(id)).toBe(false);
    expect(isChallengeId('desafio-voar')).toBe(true);
    expect(isChallengeId('combate')).toBe(false);
  });

  it('os dois idiomas têm a mesma mesa e a mesma resposta certa; exatamente uma certa', () => {
    for (const c of CHALLENGES) {
      const shape = (l: 'pt-BR' | 'en') => ({
        you: {
          life: c[l].you.life,
          cards: c[l].you.cards.map((x) => x.name),
          extra: !!c[l].you.extra,
        },
        opponent: {
          life: c[l].opponent.life,
          cards: c[l].opponent.cards.map((x) => x.name),
          extra: !!c[l].opponent.extra,
        },
        correct: c[l].options.map((o) => o.correct),
      });
      expect(shape('en')).toEqual(shape('pt-BR'));
      expect(c['pt-BR'].options.filter((o) => o.correct)).toHaveLength(1);
      for (const o of [...c['pt-BR'].options, ...c.en.options]) {
        expect(o.why.length).toBeGreaterThan(20);
      }
    }
  });

  it('nenhum endereço no texto', () => {
    expect(JSON.stringify(CHALLENGES)).not.toMatch(/https?:\/\//);
  });

  it('níveis: os intermediários vêm depois, explicam lições de "Além do básico" e há um por lição ou mais', () => {
    const intermediate = challengeIdsOf('intermediate');
    const basic = challengeIdsOf('basic');
    expect([...basic, ...intermediate]).toEqual([...CHALLENGE_IDS]);
    expect(basic).toHaveLength(7);
    for (const c of CHALLENGES) {
      const inIntermediateTrack = (LEARN_TRACKS.intermediate as readonly string[]).includes(
        c.lesson,
      );
      expect(inIntermediateTrack).toBe(challengeLevel(c) === 'intermediate');
    }
    const covered = new Set(
      CHALLENGES.filter((c) => challengeLevel(c) === 'intermediate').map((c) => c.lesson),
    );
    expect(covered.size).toBe(LEARN_TRACKS.intermediate.length);
  });
});
