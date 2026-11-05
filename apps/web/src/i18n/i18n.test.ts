import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ptBR from '../../messages/pt-BR.json';
import { DEFAULT_LOCALE, resolveLocale } from './config';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );

describe('mensagens', () => {
  it('todas as traduções têm as mesmas chaves do pt-BR', () => {
    expect(flatten(en as Tree).sort()).toEqual(flatten(ptBR as Tree).sort());
  });
});

describe('resolveLocale', () => {
  it('prioriza o cookie', () => {
    expect(resolveLocale('en', 'pt-BR')).toBe('en');
  });
  it('usa o Accept-Language', () => {
    expect(resolveLocale(undefined, 'en-US,en;q=0.9')).toBe('en');
    expect(resolveLocale(null, 'pt,en;q=0.5')).toBe('pt-BR');
    expect(resolveLocale(null, 'en-US')).toBe('en');
    expect(resolveLocale(null, 'pt-PT,en;q=0.8')).toBe('pt-BR');
  });
  it('cai no padrão', () => {
    expect(resolveLocale('xx', 'fr-FR')).toBe(DEFAULT_LOCALE);
  });
});
