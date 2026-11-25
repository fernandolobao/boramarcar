'use client';

import { searchGlossary, type LearnLocale } from '@boramarcar/core/learn';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { ManaText } from './mana';

/**
 * Glossário com busca (12.3): na página /aprender/glossario e no modo mesa. A busca ignora
 * acentos e acha pelo nome em português, em inglês (o das cartas) ou pelo texto. A lista é uma
 * `<dl>`; o total encontrado é anunciado.
 */
export function GlossarySearch({ showLessons = true }: { showLessons?: boolean }) {
  const t = useTranslations('learn.glossary');
  const locale: LearnLocale = useLocale() === 'en' ? 'en' : 'pt-BR';
  const id = useId();
  const [query, setQuery] = useState('');
  const entries = searchGlossary(locale, query);
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-q`} className="label">
          {t('search')}
        </label>
        <input
          id={`${id}-q`}
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby={`${id}-count`}
          autoComplete="off"
        />
        <p id={`${id}-count`} role="status" className="muted mt-1 text-sm">
          {t('count', { count: entries.length })}
        </p>
      </div>
      <dl className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} id={e.id} className="scroll-mt-6 space-y-1">
            <dt className="font-semibold">
              {e.term}{' '}
              <span lang={e.otherLocale === 'en' ? 'en' : 'pt-BR'} className="muted font-normal">
                ({e.otherTerm})
              </span>
              {e.kind === 'keyword' && (
                <span className="muted ms-2 text-xs font-normal">{t('keyword')}</span>
              )}
            </dt>
            <dd className="text-sm">
              <ManaText text={e.text} />
              {showLessons && e.lesson && (
                <>
                  {' '}
                  <Link
                    href={`/aprender/${e.lesson}`}
                    className="text-link underline underline-offset-2"
                  >
                    {t('seeLesson')}
                  </Link>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
