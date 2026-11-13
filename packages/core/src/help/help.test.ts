import { describe, expect, it } from 'vitest';
import { HELP } from './index';

describe('ajuda (FAQ)', () => {
  it('os dois idiomas têm as mesmas seções e perguntas, na mesma ordem', () => {
    const shape = (locale: 'pt-BR' | 'en') =>
      HELP[locale].sections.map((s) => ({
        id: s.id,
        questions: s.questions.map((q) => ({
          id: q.id,
          steps: q.steps?.length ?? 0,
          intro: q.intro?.length ?? 0,
          notes: q.notes?.length ?? 0,
        })),
      }));
    expect(shape('en')).toEqual(shape('pt-BR'));
  });

  it('ids são únicos (viram âncoras na página) e toda pergunta tem resposta', () => {
    for (const content of Object.values(HELP)) {
      const ids = content.sections.flatMap((s) => [
        s.id,
        ...s.questions.map((q) => `${s.id}/${q.id}`),
      ]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const q of content.sections.flatMap((s) => s.questions)) {
        expect((q.intro?.length ?? 0) + (q.steps?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it('não cita dados reais: só nomes de exemplo', () => {
    const text = JSON.stringify(HELP);
    expect(text).not.toMatch(/@\w+\.\w+/);
    expect(text).not.toMatch(/https?:\/\//);
  });
});
