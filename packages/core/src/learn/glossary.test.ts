import { describe, expect, it } from 'vitest';
import { GLOSSARY, glossaryFor, glossaryKeywordsIn, searchGlossary } from './glossary';
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

describe('palavras-chave no texto da carta (mesa de testes)', () => {
  it('acha as palavras-chave do texto em inglês, sem repetir e sem pegar pedaço de palavra', () => {
    const text =
      'Flying, vigilance\nWhenever this creature deals combat damage, scry 2.\nEquipped creature gets +1/+1. Equip {2}';
    expect(glossaryKeywordsIn(text, 'pt-BR').map((e) => e.id)).toEqual([
      'voar',
      'vigilancia',
      'videncia',
      'equipar',
    ]);
    // Texto da definição no idioma pedido.
    expect(glossaryKeywordsIn('Flying', 'pt-BR')[0]).toMatchObject({
      term: 'Voar',
      lesson: 'combate',
    });
    expect(glossaryKeywordsIn('Flying', 'en')[0]).toMatchObject({ term: 'Flying' });
  });

  it('acha pelo nome em português (cartas impressas em português) e ignora termos que não são palavra-chave', () => {
    expect(glossaryKeywordsIn('Voar, atropelar', 'pt-BR').map((e) => e.id)).toEqual([
      'voar',
      'atropelar',
    ]);
    // "Exile" e "sacrifice" são termos do jogo, não palavras-chave impressas: ficam de fora.
    expect(glossaryKeywordsIn('Sacrifice a creature: Exile target card.', 'pt-BR')).toEqual([]);
    expect(glossaryKeywordsIn('', 'pt-BR')).toEqual([]);
  });
});
