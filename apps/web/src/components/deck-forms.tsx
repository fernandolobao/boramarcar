'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';

export function DeckImportForm() {
  const t = useTranslations('decks');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [notFound, setNotFound] = useState<string[]>([]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setNotFound([]);
        const body =
          mode === 'url'
            ? { kind: 'url', url, name: name || undefined }
            : { kind: 'text', name, text };
        void run(
          () =>
            api<{ deck: { id: string }; notFound: string[] }>('/api/v1/decks', {
              method: 'POST',
              body,
            }),
          (result) => {
            if (result.notFound.length) setNotFound(result.notFound);
            router.push(`/decks/${result.deck.id}`);
          },
        );
      }}
    >
      <div className="flex gap-2" role="tablist">
        {(['url', 'text'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={mode === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode(value)}
          >
            {value === 'url' ? t('fromUrl') : t('fromText')}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <div>
          <label className="label" htmlFor="deck-url">
            {t('fromUrl')}
          </label>
          <input
            id="deck-url"
            type="url"
            className="input"
            required
            placeholder="https://archidekt.com/decks/123456"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="deck-text">
            {t('list')}
          </label>
          <textarea
            id="deck-text"
            className="input min-h-64 py-2 font-mono"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Commander\n1 Omnath, Locus of Mana\n\nDeck\n1 Sol Ring\n1 Cultivate #proxy\n35 Forest'
            }
          />
          <p className="muted mt-1">{t('listHint')}</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="deck-name">
          {t('name')}
        </label>
        <input
          id="deck-name"
          className="input"
          required={mode === 'text'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button className="btn-primary" disabled={pending}>
        {t('import')}
      </button>
      <FormError message={error} />
      {notFound.length > 0 && (
        <p className="muted">{t('notFound', { names: notFound.join(', ') })}</p>
      )}
    </form>
  );
}

export function ProxyToggle({
  deckId,
  cardId,
  isProxy,
  label,
}: {
  deckId: string;
  cardId: string;
  isProxy: boolean;
  label: string;
}) {
  const { run, pending } = useApiAction();
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={isProxy}
      disabled={pending}
      onChange={(e) =>
        void run(() =>
          api(`/api/v1/decks/${deckId}/cards/${cardId}`, {
            method: 'PATCH',
            body: { isProxy: e.target.checked },
          }),
        )
      }
    />
  );
}
