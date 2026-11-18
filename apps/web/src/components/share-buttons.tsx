'use client';

import { whatsappShareUrl } from '@boramarcar/core/calendar';
import { useTranslations } from 'next-intl';
import { useId, useState, useSyncExternalStore } from 'react';
import { Icon } from './icons';

const noopSubscribe = () => () => {};
/** Valor que só existe no navegador (no servidor usa `serverValue`), sem setState em efeito. */
const useClientValue = <T,>(getValue: () => T, serverValue: T) =>
  useSyncExternalStore(noopSubscribe, getValue, () => serverValue);

/** Botão "Copiar link" (mostra "Copiado!" por 2 s). */
function CopyButton({ value }: { value: string }) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary shrink-0"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <Icon name={copied ? 'copied' : 'copy'} />
      <span aria-live="polite">{copied ? t('copied') : t('copyLink')}</span>
    </button>
  );
}

/** Link num campo só de leitura, com "Copiar link" ao lado (convites e decks públicos). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <input
          id={id}
          className="input min-w-0 flex-1 font-mono"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
        />
        <CopyButton value={value} />
      </div>
    </div>
  );
}

/** Botões de compartilhamento: WhatsApp, menu nativo do celular, copiar e (opcional) agenda. */
export function ShareButtons({
  text,
  url,
  title,
  icsHref,
  copy = true,
}: {
  text: string;
  url: string;
  title: string;
  icsHref?: string;
  /** `false` quando o link já aparece num `CopyField` com o próprio botão de copiar. */
  copy?: boolean;
}) {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const canShare = useClientValue(() => typeof navigator.share === 'function', false);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="btn-primary bg-[#25D366] text-ink-950 hover:bg-[#1ebe5b]"
        href={whatsappShareUrl(text)}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="whatsapp" />
        {t('whatsapp')}
        <span className="sr-only"> {tc('newTab')}</span>
      </a>
      {canShare && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigator.share({ title, text, url }).catch(() => {})}
        >
          <Icon name="share" />
          {t('native')}
        </button>
      )}
      {copy && <CopyButton value={url} />}
      {icsHref && (
        <a className="btn-secondary" href={icsHref} download>
          <Icon name="addToCalendar" />
          {t('addToCalendar')}
        </a>
      )}
    </div>
  );
}
