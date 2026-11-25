import { describe, expect, it } from 'vitest';
import { GLOSSARY, glossaryFor, searchGlossary } from './glossary';
import { isLessonId } from './index';

describe('glossário (12.3)', () => {
  it('ids únicos em formato de âncora, texto nos dois idiomas e lição que existe', () => {
    const ids = GLOSSARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of GLOSSARY) {
      expect(e.id).toMatch(/^[a-z0-9-]+$/);
      for (const locale of ['pt-BR', 'en'] as const) {
        expect(e[locale].term.length).toBeGreaterThan(1);
        expect(e[locale].text.length).toBeGreaterThan(10);
      }
      if (e.lesson) expect(isLessonId(e.lesson)).toBe(true);
    }
    expect(JSON.stringify(GLOSSARY)).not.toMatch(/https?:\/\//);
  });

  it('em ordem alfabética do idioma', () => {
    const pt = glossaryFor('pt-BR').map((e) => e.term);
    expect(pt.indexOf('Alcance')).toBeLessThan(pt.indexOf('Ímpeto'));
    expect(pt.indexOf('Ímpeto')).toBeLessThan(pt.indexOf('Voar'));
    expect(glossaryFor('en')[0]!.term).toBe('Activated ability');
  });

  it('busca sem acento, pelo nome em inglês e pelo texto', () => {
    expect(searchGlossary('pt-BR', 'impeto').map((e) => e.id)).toEqual(['impeto']);
    expect(searchGlossary('pt-BR', 'TRAMPLE').map((e) => e.id)).toEqual(['atropelar']);
    expect(searchGlossary('pt-BR', 'voar').map((e) => e.id)).toEqual(
      expect.arrayContaining(['voar', 'alcance']),
    );
    expect(searchGlossary('en', '').length).toBe(GLOSSARY.length);
  });
});
