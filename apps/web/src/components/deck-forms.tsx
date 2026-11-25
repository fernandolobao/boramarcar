'use client';

import { formatRules, GAME_FORMATS, type GameFormat } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';
import { Checkbox } from '@/components/ds/checkbox';
import { Select } from '@/components/ds/select';
import { CardSearch } from './card-search';

interface MoxfieldBlocked {
  url: string;
}

/** O servidor sinaliza quando o Moxfield recusou a importação automática. */
function moxfieldBlockedFrom(error: unknown): MoxfieldBlocked | null {
  if (!(error instanceof ApiError) || error.code !== 'upstream_error') return null;
  const details = error.details as { source?: string; url?: string } | undefined;
  return details?.source === 'moxfield' && details.url ? { url: details.url } : null;
}

export function DeckImportForm() {
  const t = useTranslations('decks');
  const tc = useTranslations('common');
  const tf = useTranslations('formats');
  const router = useRouter();
  const [format, setFormat] = useState<GameFormat | 'auto'>('auto');
  const { run, error, pending } = useApiAction();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [notFound, setNotFound] = useState<string[]>([]);
  const [draft, setDraft] = useState(false);
  const [moxfieldBlocked, setMoxfieldBlocked] = useState<MoxfieldBlocked | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Ao cair no plano B do Moxfield, leva o foco ao campo de texto (usuários de teclado/leitor de tela).
  useEffect(() => {
    if (moxfieldBlocked && mode === 'text') textRef.current?.focus();
  }, [moxfieldBlocked, mode]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setNotFound([]);
        const chosen = format === 'auto' ? undefined : format;
        const body =
          mode === 'url'
            ? { kind: 'url', url, name: name || undefined, format: chosen, draft }
            : { kind: 'text', name: name || undefined, text, format: chosen, draft };
        void run(
          async () => {
            try {
              return await api<{ deck: { id: string }; notFound: string[] }>('/api/v1/decks', {
                method: 'POST',
                body,
              });
            } catch (e) {
              const blocked = moxfieldBlockedFrom(e);
              if (!blocked) throw e;
              setMoxfieldBlocked(blocked);
              setMode('text');
              return null;
            }
          },
          (result) => {
            if (!result) return;
            if (result.notFound.length) setNotFound(result.notFound);
            router.push(`/decks/${result.deck.id}`);
          },
        );
      }}
    >
      {moxfieldBlocked && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold">{t('moxfieldBlocked.title')}</p>
          <p>{t('moxfieldBlocked.intro')}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a href={moxfieldBlocked.url} target="_blank" rel="noreferrer" className="underline">
                {t('moxfieldBlocked.step1')}
                <span className="sr-only"> {tc('newTab')}</span>
              </a>
            </li>
            <li>{t('moxfieldBlocked.step2')}</li>
            <li>{t('moxfieldBlocked.step3')}</li>
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('importMode')}>
        {(['url', 'text'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            className={mode === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode(value)}
          >
            <Icon name={value === 'url' ? 'fromUrl' : 'fromText'} />
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
            ref={textRef}
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
          {t('name')} <span className="muted">({tc('optional')})</span>
        </label>
        <input
          id="deck-name"
          className="input"
          aria-describedby="deck-name-hint"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p id="deck-name-hint" className="muted mt-1">
          {t('nameHint')}
        </p>
      </div>

      <div>
        <Select
          label={t('format')}
          id="deck-import-format"
          description={t('formatHint')}
          value={String(format)}
          onChange={(v) => setFormat(v as GameFormat | 'auto')}
          options={[
            { value: 'auto', label: t('formatAuto') },
            ...GAME_FORMATS.map((f) => ({ value: String(f), label: tf(f) })),
          ]}
        />
      </div>

      <Checkbox
        label={t('draft.label')}
        description={t('draft.importHint')}
        checked={draft}
        onChange={setDraft}
      />

      <button className="btn-primary" disabled={pending}>
        <Icon name="upload" />
        {t('import')}
      </button>
      <FormError message={error} />
      {notFound.length > 0 && (
        <p className="muted">{t('notFound', { names: notFound.join(', ') })}</p>
      )}
    </form>
  );
}

/**
 * Deck do zero (11.1): nome, tipo de jogo e, se quiser, o comandante; as cartas entram pelo editor
 * na página do deck. Começa como rascunho (11.2): as cartas ficam fora da coleção até publicar.
 */
export function DeckCreateForm() {
  const t = useTranslations('decks');
  const tc = useTranslations('common');
  const tf = useTranslations('formats');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<GameFormat>('commander');
  const [commander, setCommander] = useState('');
  const [draft, setDraft] = useState(true);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api<{ deck: { id: string } }>('/api/v1/decks', {
              method: 'POST',
              body: {
                kind: 'empty',
                name,
                format,
                commander:
                  formatRules(format).usesCommander && commander.trim() ? commander : undefined,
                draft,
              },
            }),
          (result) => router.push(`/decks/${result.deck.id}`),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="new-deck-name">
          {t('name')}
        </label>
        <input
          id="new-deck-name"
          className="input"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Select
        label={t('format')}
        id="new-deck-format"
        value={String(format)}
        onChange={(v) => setFormat(v as GameFormat)}
        options={GAME_FORMATS.map((f) => ({ value: String(f), label: tf(f) }))}
      />
      {/* Só nos formatos com comandante (Commander, Brawl, Oathbreaker…); os outros não têm. */}
      {formatRules(format).usesCommander && (
        <div>
          <CardSearch
            id="new-deck-commander"
            label={`${t('create.commander')} (${tc('optional')})`}
            value={commander}
            onChange={setCommander}
            required={false}
          />
          <p className="muted mt-1 text-sm">{t('create.commanderHint')}</p>
        </div>
      )}
      <Checkbox
        label={t('draft.label')}
        description={t('draft.createHint')}
        checked={draft}
        onChange={setDraft}
      />
      <button className="btn-primary" disabled={pending}>
        <Icon name="add" />
        {t('create.submit')}
      </button>
      <FormError message={error} />
    </form>
  );
}

/** Aviso do rascunho na página do deck (dono) e o botão de publicar (11.2). */
export function PublishDeck({ deckId }: { deckId: string }) {
  const t = useTranslations('decks.draft');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  return (
    <div className="space-y-2 rounded-xl border border-line-strong bg-surface p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="draft" />
        {t('title')}
      </p>
      <p className="text-sm">{t('body')}</p>
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          void run(
            () => api(`/api/v1/decks/${deckId}/publish`, { method: 'POST' }),
            // A página recarrega sem o aviso; a confirmação vem pelo endereço (anunciada lá).
            () => router.replace(`/decks/${deckId}?publicado=1`),
          )
        }
      >
        <Icon name="publish" />
        {t('publish')}
      </button>
      <FormError message={error} />
    </div>
  );
}
