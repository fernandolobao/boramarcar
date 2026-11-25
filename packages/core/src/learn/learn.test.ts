import { describe, expect, it } from 'vitest';
import { isLessonId, LEARN, LEARN_TRACKS, LESSON_IDS, OFFICIAL_LINKS, TRACK_IDS } from './index';

describe('aprender a jogar (12.1)', () => {
  it('os dois idiomas têm as mesmas lições e seções, na ordem de LESSON_IDS', () => {
    const shape = (locale: 'pt-BR' | 'en') =>
      LEARN[locale].lessons.map((l) => ({
        id: l.id,
        track: l.track,
        minutes: l.minutes,
        remember: l.remember.length,
        sections: l.sections.map((s) => ({
          id: s.id,
          paragraphs: s.paragraphs.length,
          cards: s.cards ?? [],
        })),
      }));
    expect(shape('en')).toEqual(shape('pt-BR'));
    expect(LEARN['pt-BR'].lessons.map((l) => l.id)).toEqual([...LESSON_IDS]);
  });

  it('cada lição está no bloco certo, e os blocos têm título nos dois idiomas', () => {
    for (const content of Object.values(LEARN)) {
      for (const track of TRACK_IDS) {
        expect(content.lessons.filter((l) => l.track === track).map((l) => l.id)).toEqual([
          ...LEARN_TRACKS[track],
        ]);
        expect(content.tracks[track].title.length).toBeGreaterThan(3);
      }
    }
  });

  it('seções com id único dentro da lição e texto em todas', () => {
    for (const content of Object.values(LEARN)) {
      for (const lesson of content.lessons) {
        const ids = lesson.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(lesson.remember.length).toBeGreaterThan(0);
        for (const s of lesson.sections) expect(s.paragraphs.length).toBeGreaterThan(0);
      }
    }
  });

  it('só links oficiais da Wizards; nenhum endereço dentro do texto', () => {
    expect(JSON.stringify(LEARN)).not.toMatch(/https?:\/\//);
    for (const links of Object.values(OFFICIAL_LINKS)) {
      for (const url of Object.values(links)) {
        expect(url).toMatch(/^https:\/\/magic\.wizards\.com\//);
      }
    }
  });

  it('símbolos de mana do texto são os conhecidos', () => {
    const texts = Object.values(LEARN).flatMap((c) =>
      c.lessons.flatMap((l) => [...l.remember, ...l.sections.flatMap((s) => s.paragraphs)]),
    );
    const symbols = texts.flatMap((t) => [...t.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]));
    expect(symbols.length).toBeGreaterThan(0);
    for (const s of symbols) expect(s).toMatch(/^(W|U|B|R|G|C|T|\d+)$/);
  });

  it('isLessonId', () => {
    expect(isLessonId('combate')).toBe(true);
    expect(isLessonId('../admin')).toBe(false);
  });
});
