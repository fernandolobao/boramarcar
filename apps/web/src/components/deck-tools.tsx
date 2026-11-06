'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/** Exportar a lista (copiar/baixar) e, para o dono, atualizar o deck pela origem ou por texto. */
export function DeckTools({
  deckId,
  isOwner,
  source,
  hasSourceUrl,
  proxyCount = 0,
}: {
  deckId: string;
  isOwner: boolean;
  source: string;
  hasSourceUrl: boolean;
  /** Cópias marcadas como proxy (para a folha de impressão). */
  proxyCount?: number;
}) {
  const t = useTranslations('decks');
  const id = useId();
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const sync = useApiAction();
  const [which, setWhich] = useState<'proxies' | 'all'>(proxyCount > 0 ? 'proxies' : 'all');
  const [paper, setPaper] = useState<'a4' | 'letter'>('a4');

  const copy = async (format: 'plain' | 'proxies') => {
    setCopied('');
    setCopyError(false);
    try {
      const response = await fetch(`/api/v1/decks/${deckId}/export?format=${format}`);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setCopied(t('copied'));
    } catch {
      setCopyError(true);
    }
  };

  const runSync = (body: { text?: string }) =>
    void sync.run(
      () =>
        api<{ added: string[]; removed: string[]; changed: string[] }>(
          `/api/v1/decks/${deckId}/sync`,
          { method: 'POST', body },
        ),
      (r) => {
        setResult(
          t('syncResult', {
            added: r.added.length,
            removed: r.removed.length,
            changed: r.changed.length,
          }),
        );
        setText('');
      },
    );

  return (
    <section className="card space-y-4" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title mb-0">
        {t('tools')}
      </h2>
      <div className="space-y-2">
        <h3 className="font-semibold">{t('export')}</h3>
        <p className="muted text-sm">{t('exportHint')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void copy('plain')}>
            <Icon name="copy" />
            {t('exportPlain')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void copy('proxies')}>
            <Icon name="copy" />
            {t('exportProxies')}
          </button>
          <a
            className="btn-secondary"
            href={`/api/v1/decks/${deckId}/export?format=proxies&download=1`}
            download
          >
            <Icon name="download" />
            {t('download')}
          </a>
        </div>
        <p role="status" className="muted text-sm">
          {copied}
        </p>
        <FormError message={copyError ? t('copyFailed') : null} />
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="font-semibold">{t('print')}</h3>
        <p className="muted text-sm">{t('printHint')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <fieldset>
            <legend className="label">{t('printWhich')}</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex min-h-6 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${id}-which`}
                  checked={which === 'proxies'}
                  disabled={proxyCount === 0}
                  onChange={() => setWhich('proxies')}
                />
                {t('printProxies', { count: proxyCount })}
              </label>
              <label className="flex min-h-6 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${id}-which`}
                  checked={which === 'all'}
                  onChange={() => setWhich('all')}
                />
                {t('printAll')}
              </label>
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor={`${id}-paper`}>
              {t('paper')}
            </label>
            <select
              id={`${id}-paper`}
              className="select"
              value={paper}
              onChange={(e) => setPaper(e.target.value as 'a4' | 'letter')}
            >
              <option value="a4">A4</option>
              <option value="letter">{t('letter')}</option>
            </select>
          </div>
          <Link
            className="btn-primary"
            href={`/decks/${deckId}/imprimir?which=${which}&page=${paper}`}
          >
            <Icon name="print" />
            {t('printOpen')}
          </Link>
          <a
            className="btn-secondary"
            href={`/api/v1/decks/${deckId}/proxies?which=${which}&page=${paper}`}
            download
          >
            <Icon name="download" />
            {t('printPdfServer')}
          </a>
        </div>
        {proxyCount === 0 && <p className="muted text-sm">{t('printNoProxies')}</p>}
      </div>

      {isOwner && (
        <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="font-semibold">{t('sync')}</h3>
          {hasSourceUrl && (
            <>
              <p className="muted text-sm">{t('syncHint')}</p>
              <button
                type="button"
                className="btn-secondary"
                disabled={sync.pending}
                onClick={() => runSync({})}
              >
                <Icon name="refresh" />
                {t('syncFromSource', { source })}
              </button>
            </>
          )}
          <details className="rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700">
            <summary className="cursor-pointer py-1 font-medium">{t('syncPaste')}</summary>
            <form
              className="mt-2 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) runSync({ text });
              }}
            >
              <label className="label" htmlFor={`${id}-text`}>
                {t('list')}
              </label>
              <p id={`${id}-hint`} className="muted text-sm">
                {t('syncPasteHint')}
              </p>
              <textarea
                id={`${id}-text`}
                className="input min-h-40 py-2 font-mono text-xs"
                aria-describedby={`${id}-hint`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button className="btn-primary" disabled={sync.pending || !text.trim()}>
                <Icon name="refresh" />
                {t('syncRun')}
              </button>
            </form>
          </details>
          <p role="status" className="text-sm">
            {!sync.error && result}
          </p>
          <FormError message={sync.error} />
        </div>
      )}
    </section>
  );
}
