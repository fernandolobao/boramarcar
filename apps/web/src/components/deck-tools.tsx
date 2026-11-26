'use client';

import type { DeckVisibility, GameFormat } from '@boramarcar/core';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { api } from '@/lib/api';
import { Select } from '@/components/ds/select';
import { Choices } from './ds/choices';
import { DeckEditContent } from './deck-edit-dialog';
import { Icon, type IconName } from './icons';
import { Modal } from './modal-button';
import { FormError, useApiAction } from './use-api-action';

type Dialog = 'edit' | 'print' | 'paste' | null;

const item =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[focused]:bg-surface-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

/**
 * Menu "Opções do deck" no canto do topo da página: editar (dono), copiar e baixar a lista,
 * imprimir proxies e, para o dono, atualizar pela origem ou por uma lista colada. As ações com
 * formulário abrem numa janela; o foco volta ao botão do menu.
 */
export function DeckActions({
  deckId,
  isOwner,
  source,
  hasSourceUrl,
  proxyCount = 0,
  edit,
}: {
  deckId: string;
  isOwner: boolean;
  source: string;
  hasSourceUrl: boolean;
  /** Cópias marcadas como proxy (para a folha de impressão). */
  proxyCount?: number;
  /** Dados para "Editar deck" (só o dono). */
  edit?: { name: string; format: GameFormat; visibility: DeckVisibility; draft?: boolean };
}) {
  const t = useTranslations('decks');
  const tTable = useTranslations('playtest');
  const trigger = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState('');
  const [copyError, setCopyError] = useState(false);
  const sync = useApiAction();

  const copy = async (format: 'plain' | 'proxies') => {
    setMessage('');
    setCopyError(false);
    try {
      const response = await fetch(`/api/v1/decks/${deckId}/export?format=${format}`);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setMessage(t('copied'));
    } catch {
      setCopyError(true);
    }
  };

  const runSync = (body: { text?: string }, done?: () => void) =>
    void sync.run(
      () =>
        api<{ added: string[]; removed: string[]; changed: string[] }>(
          `/api/v1/decks/${deckId}/sync`,
          { method: 'POST', body },
        ),
      (r) => {
        setMessage(
          t('syncResult', {
            added: r.added.length,
            removed: r.removed.length,
            changed: r.changed.length,
          }),
        );
        done?.();
      },
    );

  const entries: { key: string; label: string; icon: IconName; href?: string; dialog?: boolean }[] =
    [
      ...(isOwner && edit
        ? [{ key: 'edit', label: t('settings'), icon: 'edit' as const, dialog: true }]
        : []),
      // Mesa de testes solo (11.4): também na aba "Mão inicial" da análise.
      { key: 'playtest', label: tTable('open'), icon: 'play', href: `/decks/${deckId}/testar` },
      { key: 'copy', label: t('exportPlain'), icon: 'copy' },
      { key: 'copyProxies', label: t('exportProxies'), icon: 'copy' },
      {
        key: 'download',
        label: t('download'),
        icon: 'download',
        href: `/api/v1/decks/${deckId}/export?format=proxies&download=1`,
      },
      { key: 'print', label: t('printMenu'), icon: 'print', dialog: true },
      ...(isOwner && hasSourceUrl
        ? [{ key: 'sync', label: t('syncFromSource', { source }), icon: 'refresh' as const }]
        : []),
      ...(isOwner
        ? [{ key: 'paste', label: t('pasteMenu'), icon: 'refresh' as const, dialog: true }]
        : []),
    ];

  return (
    <div className="flex flex-col items-end gap-1">
      <MenuTrigger>
        <Button ref={trigger} className="btn-secondary">
          <Icon name="settings" />
          {t('actions')}
          <Icon name="chevronDown" className="size-4 shrink-0" />
        </Button>
        <Popover
          placement="bottom end"
          className="min-w-64 rounded-xl border border-line-strong bg-surface p-1 text-fg shadow-xl"
        >
          <Menu
            aria-label={t('actions')}
            className="outline-none"
            onAction={(key) => {
              if (key === 'edit' || key === 'print' || key === 'paste') setDialog(key);
              else if (key === 'copy') void copy('plain');
              else if (key === 'copyProxies') void copy('proxies');
              else if (key === 'sync') runSync({});
            }}
          >
            {entries.map((e) => (
              <MenuItem key={e.key} id={e.key} href={e.href} textValue={e.label} className={item}>
                <Icon name={e.icon} />
                <span>
                  {e.label}
                  {e.dialog && <span aria-hidden="true">…</span>}
                </span>
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
      <p role="status" className="text-sm">
        {!sync.error && message}
      </p>
      <FormError message={copyError ? t('copyFailed') : sync.error} />

      {isOwner && edit && (
        <Modal
          open={dialog === 'edit'}
          onClose={() => setDialog(null)}
          title={t('settings')}
          returnFocus={trigger}
        >
          <DeckEditContent deckId={deckId} {...edit} onSaved={() => setDialog(null)} />
        </Modal>
      )}
      <Modal
        open={dialog === 'print'}
        onClose={() => setDialog(null)}
        title={t('print')}
        returnFocus={trigger}
      >
        <DeckPrintForm deckId={deckId} proxyCount={proxyCount} />
      </Modal>
      {isOwner && (
        <Modal
          open={dialog === 'paste'}
          onClose={() => setDialog(null)}
          title={t('syncPaste')}
          returnFocus={trigger}
        >
          <DeckPasteForm
            pending={sync.pending}
            error={sync.error}
            onSubmit={(text) => runSync({ text }, () => setDialog(null))}
          />
        </Modal>
      )}
    </div>
  );
}

/** Folha de proxies: quais cartas e o papel; abrir a folha no navegador ou baixar o PDF pronto. */
export function DeckPrintForm({ deckId, proxyCount }: { deckId: string; proxyCount: number }) {
  const t = useTranslations('decks');
  const id = useId();
  const [which, setWhich] = useState<'proxies' | 'all'>(proxyCount > 0 ? 'proxies' : 'all');
  const [paper, setPaper] = useState<'a4' | 'letter'>('a4');
  return (
    <div className="space-y-4">
      <p className="muted text-sm">{t('printHint')}</p>
      <Choices<'proxies' | 'all'>
        label={t('printWhich')}
        value={which}
        onChange={setWhich}
        options={[
          {
            value: 'proxies',
            label: t('printProxies', { count: proxyCount }),
            disabled: proxyCount === 0,
          },
          { value: 'all', label: t('printAll') },
        ]}
      />
      {proxyCount === 0 && <p className="muted text-sm">{t('printNoProxies')}</p>}
      <Select
        label={t('paper')}
        id={`${id}-paper`}
        value={paper}
        onChange={(v) => setPaper(v as 'a4' | 'letter')}
        options={[
          { value: 'a4', label: 'A4' },
          { value: 'letter', label: t('letter') },
        ]}
      />
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}

/** Atualizar o deck colando a lista (dono): quantidades da lista; as marcações de proxy ficam. */
export function DeckPasteForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (text: string) => void;
}) {
  const t = useTranslations('decks');
  const id = useId();
  const [text, setText] = useState('');
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text);
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
      <button className="btn-primary" disabled={pending || !text.trim()}>
        <Icon name="refresh" />
        {t('syncRun')}
      </button>
      <FormError message={error} />
    </form>
  );
}
